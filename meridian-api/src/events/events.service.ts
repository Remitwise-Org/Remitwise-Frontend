import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, FindOptionsWhere } from 'typeorm';
import { createHash, randomBytes, createHmac } from 'crypto';
import { AuditLog, AuditAction } from '../audit/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { Webhook } from './webhook.entity';
import { LeaderboardProofService } from '../leaderboard/leaderboard-proof.service';
import { CryptoProvider } from 'src/crypto/providers/crypto.provider';
import { CorrelationIdStore } from '../common/correlation/correlation-id.store';
import { CORRELATION_ID_RESPONSE_HEADER } from '../common/correlation/correlation-id.constants';

export interface ContractEvent {
  txHash: string;
  contract: string;
  action: string;
  blockNumber: number;
  data?: Record<string, unknown>;
  address?: string;
  stateRoot?: string;
}

export interface MerkleProofResult {
  leaf: string;
  proof: string[];
  root: string;
  verified: boolean;
  leafIndex: number;
}

export interface RpcProvider {
  getLatestBlockNumber(): Promise<number>;
  getEvents(fromBlock: number, toBlock: number): Promise<ContractEvent[]>;
}

@Injectable()
export class EventsService implements OnModuleInit {
  private readonly logger = new Logger(EventsService.name);
  private lastPolledBlock: number = 0;
  private provider: RpcProvider | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly auditService: AuditService,
    private readonly leaderboardProofService: LeaderboardProofService,
    @InjectRepository(Webhook)
    private readonly webhookRepo: Repository<Webhook>,

    // Envelope encryption (issue #631): webhook secrets are encrypted at
    // rest and only decrypted in-memory at delivery time.
    private readonly cryptoProvider: CryptoProvider,
    private readonly correlationIdStore: CorrelationIdStore,
  ) {}

  onModuleInit(): void {
    this.startPolling();
  }

  setProvider(provider: RpcProvider): void {
    this.provider = provider;
  }

  startPolling(intervalMs: number = 30_000): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
    this.pollingInterval = setInterval(
      () => this.pollContractEvents(),
      intervalMs,
    );
    this.pollContractEvents();
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  async pollContractEvents(): Promise<void> {
    if (!this.provider) {
      this.logger.warn('No RPC provider configured; skipping poll');
      return;
    }

    try {
      const latestBlock = await this.provider.getLatestBlockNumber();
      if (latestBlock <= this.lastPolledBlock) return;

      const fromBlock = this.lastPolledBlock + 1;
      this.logger.log(
        `Polling events from block ${fromBlock} to ${latestBlock}`,
      );

      const events = await this.provider.getEvents(fromBlock, latestBlock);
      for (const event of events) {
        try {
          const contribution = this.leaderboardProofService.extractContribution(event);
          const epochNumber = this.leaderboardProofService.getEpochNumberFromBlock(event.blockNumber);

          const auditEntry = await this.auditService.logContractEvent({
            txHash: event.txHash,
            contract: event.contract,
            contractAction: event.action,
            blockNumber: event.blockNumber,
            rawEvent: (event.data || {}) as Record<string, unknown>,
            participantAddress: contribution.address,
            contributionXp: contribution.xp,
            epochNumber,
            stateRoot: event.stateRoot ?? this.readStateRoot(event.data),
          });

          await this.deliverWebhooks(event, auditEntry);
        } catch (err) {
          this.logger.error(
            `Failed to ingest event ${event.txHash}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }

      this.lastPolledBlock = latestBlock;
    } catch (err) {
      this.logger.error(
        `Polling failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async findAuditLogs(params: {
    cursor?: number;
    limit: number;
    contract?: string;
    action?: string;
    address?: string;
    auditAction?: AuditAction;
  }): Promise<{ data: AuditLog[]; nextCursor: number | null; total: number }> {
    const where: FindOptionsWhere<AuditLog> = {};

    if (params.cursor) {
      where.id = LessThan(params.cursor);
    }
    if (params.contract) {
      where.contract = params.contract;
    }
    if (params.action) {
      where.contractAction = params.action;
    }
    if (params.auditAction) {
      where.action = params.auditAction;
    }

    const [data, total] = await Promise.all([
      this.auditService['auditRepo'].find({
        where,
        order: { id: 'DESC' },
        take: params.limit + 1,
      }),
      this.auditService['auditRepo'].count({ where }),
    ]);

    const hasMore = data.length > params.limit;
    const items = hasMore ? data.slice(0, params.limit) : data;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    return { data: items, nextCursor, total };
  }

  async findByTxHash(txHash: string): Promise<AuditLog | null> {
    return this.auditService['auditRepo'].findOne({ where: { txHash } });
  }

  /**
   * Admin-only audit log review (issue #632): aggregate statistics over the
   * whole audit log — total entries, counts grouped by action and by
   * contract, and hash-chain integrity.
   */
  async getAuditStats(): Promise<{
    total: number;
    byAction: Array<{ action: string; count: string }>;
    byContract: Array<{ contract: string; count: string }>;
    chainValid: boolean;
    chainEntries: number;
  }> {
    const repo = this.auditService['auditRepo'];
    const [total, byAction, byContract, chain] = await Promise.all([
      repo.count(),
      repo
        .createQueryBuilder('log')
        .select('log.action', 'action')
        .addSelect('COUNT(*)', 'count')
        .groupBy('log.action')
        .getRawMany(),
      repo
        .createQueryBuilder('log')
        .select('log.contract', 'contract')
        .addSelect('COUNT(*)', 'count')
        .where('log.contract IS NOT NULL')
        .groupBy('log.contract')
        .getRawMany(),
      this.verifyHashChain(),
    ]);

    return {
      total,
      byAction,
      byContract,
      chainValid: chain.valid,
      chainEntries: chain.entries,
    };
  }

  async registerWebhook(dto: {
    url: string;
    contract?: string;
    action?: string;
    address?: string;
    generateSecret?: boolean;
  }): Promise<Webhook> {
    const secret =
      dto.generateSecret !== false
        ? randomBytes(32).toString('hex')
        : 'no-secret';

    // Encrypt the secret at rest (issue #631). In transparent-fallback mode
    // (no KEK) the secret keeps the legacy plaintext column so ciphertext
    // columns never hold plaintext; production requires a KEK via env schema.
    let storedSecret: string | null = null;
    let encryptedData: string | null = null;
    let dataEncryptionKeyId: string | null = null;
    if (this.cryptoProvider.isEnabled()) {
      const encrypted = await this.cryptoProvider.encrypt(secret);
      encryptedData = encrypted.ciphertext;
      dataEncryptionKeyId = encrypted.dekId;
    } else {
      storedSecret = secret;
    }

    const webhook = this.webhookRepo.create({
      url: dto.url,
      contract: dto.contract || null,
      action: dto.action || null,
      address: dto.address || null,
      secret: storedSecret,
      encryptedData,
      dataEncryptionKeyId,
    });

    const saved = await this.webhookRepo.save(webhook);

    // Return the plaintext secret exactly once (registration response) so the
    // client can verify X-Webhook-Signature; the envelope columns stay hidden.
    return {
      ...saved,
      secret,
      encryptedData: null,
      dataEncryptionKeyId: null,
    };
  }

  async verifyHashChain(): Promise<{
    valid: boolean;
    entries: number;
    tamperedAt?: number;
  }> {
    const entries = await this.auditService['auditRepo'].find({
      where: { action: AuditAction.CONTRACT_EVENT },
      order: { id: 'ASC' },
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const payload = `${entry.txHash}:${entry.contract}:${entry.contractAction}:${entry.blockNumber}:${JSON.stringify(entry.rawEvent || {})}:${entry.previousHash ?? ''}`;
      const expectedHash = createHash('sha256').update(payload).digest('hex');

      if (entry.chainHash !== expectedHash) {
        return { valid: false, entries: entries.length, tamperedAt: entry.id };
      }

      const expectedPreviousHash = i === 0 ? null : entries[i - 1].chainHash;
      if (entry.previousHash !== expectedPreviousHash) {
        return { valid: false, entries: entries.length, tamperedAt: entry.id };
      }
    }

    return { valid: true, entries: entries.length };
  }

  async buildMerkleProof(index: number, entries: Array<Pick<AuditLog, 'chainHash'> & Partial<Pick<AuditLog, 'stateRoot'>>> = []): Promise<MerkleProofResult | null> {
    const leaves = entries
      .filter((entry) => Boolean(entry.chainHash))
      .map((entry) => entry.chainHash as string);

    if (leaves.length === 0 || index < 0 || index >= leaves.length) {
      return null;
    }

    const leaf = leaves[index];
    const proof: string[] = [];
    let currentLevel = [...leaves].map((value) => this.hashLeaf(value));
    let currentIndex = index;

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];
      const levelSize = currentLevel.length;

      for (let i = 0; i < levelSize; i += 2) {
        const left = currentLevel[i];
        const right = currentLevel[i + 1] ?? left;
        const combined = this.hashNode(left, right);
        nextLevel.push(combined);

        if (i === currentIndex || i + 1 === currentIndex) {
          const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
          const sibling = siblingIndex < levelSize ? currentLevel[siblingIndex] : left;
          proof.push(sibling);
        }
      }

      currentIndex = Math.floor(currentIndex / 2);
      currentLevel = nextLevel;
    }

    const computedRoot = currentLevel[0] ?? '';
    const anchoredRoot = entries[index]?.stateRoot ?? entries[0]?.stateRoot ?? null;

    return {
      leaf,
      proof,
      root: anchoredRoot ?? computedRoot,
      verified: anchoredRoot == null || anchoredRoot === computedRoot,
      leafIndex: index,
    };
  }

  private readStateRoot(data?: Record<string, unknown>): string | null {
    const value = data?.stateRoot ?? data?.state_root;
    return typeof value === 'string' ? value : null;
  }

  verifyMerkleProof(leaf: string, proof: string[], root: string): boolean {
    if (!leaf || !root) {
      return false;
    }

    let candidates = [this.hashLeaf(leaf)];
    for (const sibling of proof) {
      const nextCandidates: string[] = [];
      for (const candidate of candidates) {
        nextCandidates.push(this.hashNode(candidate, sibling));
        nextCandidates.push(this.hashNode(sibling, candidate));
      }
      candidates = nextCandidates;
    }

    return candidates.includes(root);
  }

  async getLeaderboardProofs(limit = 10): Promise<{ root: string; entries: Array<AuditLog & { proof: MerkleProofResult | null }> }> {
    const logs = await this.auditService['auditRepo'].find({
      where: { action: AuditAction.CONTRACT_EVENT },
      order: { id: 'DESC' },
      take: limit,
    });

    const entries = await Promise.all(logs.map(async (log, index) => ({
      ...log,
      proof: await this.buildMerkleProof(index, logs),
    })));

    const root = entries[0]?.proof?.root ?? '';

    return { root, entries };
  }

  private hashLeaf(value: string): string {
    return this.simpleHash(value);
  }

  private hashNode(left: string, right: string): string {
    return this.simpleHash(`${left}:${right}`);
  }

  private simpleHash(value: string): string {
    let state = 0x811c9dc5;
    let state2 = 0x811c9dc5;
    for (let i = 0; i < value.length; i++) {
      state ^= value.charCodeAt(i);
      state = Math.imul(state, 0x01000193);
      state2 ^= value.charCodeAt(i);
      state2 = Math.imul(state2, 0x01000193);
    }
    const p1 = (state >>> 0).toString(16).padStart(8, '0');
    const p2 = (state2 >>> 0).toString(16).padStart(8, '0');
    return p1 + p2;
  }

  private async deliverWebhooks(
    event: ContractEvent,
    auditEntry: AuditLog,
  ): Promise<void> {
    const webhooks = await this.webhookRepo.find({
      where: [
        { isActive: true, contract: event.contract, action: event.action },
        { isActive: true, contract: event.contract, action: null as string },
        { isActive: true, contract: null as string, action: null as string },
      ],
    });

    for (const wh of webhooks) {
      if (wh.address && event.address && wh.address !== event.address) continue;

      try {
        // Resolve the signing secret: decrypt the envelope for new rows,
        // fall back to the legacy plaintext column for pre-migration rows.
        const secret = wh.encryptedData
          ? await this.cryptoProvider.decrypt(wh.encryptedData)
          : (wh.secret ?? '');

        const payload = JSON.stringify({
          txHash: event.txHash,
          contract: event.contract,
          action: event.action,
          blockNumber: event.blockNumber,
          data: event.data || {},
          auditId: auditEntry.id,
          chainHash: auditEntry.chainHash,
          timestamp: new Date().toISOString(),
        });

        const signature = createHmac('sha256', secret)
          .update(payload)
          .digest('hex');

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const correlationId =
          auditEntry.correlationId ?? this.correlationIdStore.get() ?? '';

        const response = await fetch(wh.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': Date.now().toString(),
            [CORRELATION_ID_RESPONSE_HEADER]: correlationId,
          },
          body: payload,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          await this.webhookRepo.update(wh.id, {
            lastTriggeredAt: new Date(),
            failureCount: 0,
          });
        } else {
          await this.webhookRepo.update(wh.id, {
            failureCount: wh.failureCount + 1,
            lastTriggeredAt: new Date(),
          });
          if (wh.failureCount + 1 >= 10) {
            await this.webhookRepo.update(wh.id, { isActive: false });
            this.logger.warn(
              `Webhook ${wh.id} deactivated after ${wh.failureCount + 1} failures`,
            );
          }
        }
      } catch (err) {
        this.logger.error(
          `Webhook delivery failed for ${wh.id}: ${err instanceof Error ? err.message : String(err)}`,
        );
        await this.webhookRepo.update(wh.id, {
          failureCount: wh.failureCount + 1,
        });
        if (wh.failureCount + 1 >= 10) {
          await this.webhookRepo.update(wh.id, { isActive: false });
        }
      }
    }
  }
}