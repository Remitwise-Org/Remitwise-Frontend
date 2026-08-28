import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { AuditLog, AuditAction } from '../audit/audit-log.entity';
import { LeaderboardEpoch } from './leaderboard-epoch.entity';
import { ContractEvent } from '../events/events.service';
import { CorrelationIdStore } from '../common/correlation/correlation-id.store';

export interface ContributionExtraction {
  address: string | null;
  xp: number;
}

const EPOCH_START = new Date('2024-01-01T00:00:00Z').getTime();
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function getEpochNumber(timestamp: number): number {
  return Math.floor((timestamp - EPOCH_START) / WEEK_MS) + 1;
}

@Injectable()
export class LeaderboardProofService {
  private readonly logger = new Logger(LeaderboardProofService.name);

  constructor(
    @InjectRepository(LeaderboardEpoch)
    private readonly epochRepo: Repository<LeaderboardEpoch>,
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly correlationIdStore: CorrelationIdStore,
  ) {}

  private logWithCorrelation(message: string, extra: Record<string, unknown> = {}): void {
    this.logger.log(
      JSON.stringify({
        msg: message,
        correlationId: this.correlationIdStore.get() ?? null,
        ...extra,
      }),
    );
  }

  async getOrCreateCurrentEpoch(): Promise<LeaderboardEpoch> {
    const latest = await this.epochRepo.findOne({
      order: { epoch: 'DESC' },
    });

    if (latest && !latest.endedAt) {
      return latest;
    }

    const epochNumber = latest ? latest.epoch + 1 : 1;
    const startedAt = new Date(EPOCH_START + (epochNumber - 1) * WEEK_MS);
    const endedAt = new Date(startedAt.getTime() + WEEK_MS);

    const epoch = this.epochRepo.create({
      epoch: epochNumber,
      merkleRoot: '',
      actionCount: 0,
      startedAt,
      endedAt,
    });

    return this.epochRepo.save(epoch);
  }

  async closeEpoch(epochNumber: number): Promise<LeaderboardEpoch | null> {
    const epoch = await this.epochRepo.findOne({ where: { epoch: epochNumber } });
    if (!epoch) return null;

    const entries = await this.auditRepo.find({
      where: {
        action: AuditAction.CONTRACT_EVENT,
        epochNumber,
        chainHash: Not(IsNull()),
      },
      order: { id: 'ASC' },
    });

    const leaves = entries.map((e) => e.chainHash as string);
    const root = this.computeMerkleRoot(leaves);

    epoch.merkleRoot = root;
    epoch.actionCount = entries.length;
    epoch.endedAt = new Date();
    return this.epochRepo.save(epoch);
  }

  async getProof(address: string, epoch: number) {
    this.logWithCorrelation('leaderboard.getProof', { address, epoch });
    const epochRecord = await this.epochRepo.findOne({ where: { epoch } });
    if (!epochRecord) {
      return null;
    }

    const participantEntries = await this.auditRepo.find({
      where: {
        action: AuditAction.CONTRACT_EVENT,
        epochNumber: epoch,
        participantAddress: address,
        chainHash: Not(IsNull()),
      },
      order: { id: 'ASC' },
    });

    const allEntries = await this.auditRepo.find({
      where: {
        action: AuditAction.CONTRACT_EVENT,
        epochNumber: epoch,
        chainHash: Not(IsNull()),
      },
      order: { id: 'ASC' },
    });

    const leaves = allEntries
      .map((e) => e.chainHash as string)
      .filter(Boolean);

    const mappedEntries = participantEntries.map((entry) => {
      const leafIndex = leaves.indexOf(entry.chainHash as string);
      const proof = leafIndex >= 0 ? this.computeProof(leaves, leafIndex) : null;

      return {
        txHash: entry.txHash,
        contract: entry.contract,
        action: entry.contractAction,
        blockNumber: entry.blockNumber,
        xp: entry.contributionXp ?? 0,
        proof,
        rawEvent: entry.rawEvent,
      };
    });

    const totalXp = mappedEntries.reduce((sum, e) => sum + e.xp, 0);

    return {
      address,
      epoch,
      root: epochRecord.merkleRoot,
      totalXp,
      entries: mappedEntries,
    };
  }

  async getRankings(epoch?: number): Promise<any[]> {
    const targetEpoch = epoch ?? (await this.getLatestClosedEpoch())?.epoch;
    if (!targetEpoch) return [];

    const entries = await this.auditRepo
      .createQueryBuilder('audit')
      .select('audit.participantAddress', 'address')
      .addSelect('SUM(audit.contributionXp)', 'totalXp')
      .addSelect('COUNT(CASE WHEN audit.contract = \'claims\' AND audit.contractAction = \'settled\' THEN 1 END)', 'claimsSettled')
      .addSelect('COUNT(CASE WHEN audit.contract = \'oracle\' AND audit.contractAction = \'ValuationUpdated\' THEN 1 END)', 'valuationsProvided')
      .addSelect('COUNT(CASE WHEN audit.contract = \'governance\' AND audit.contractAction = \'vote\' THEN 1 END)', 'governanceParticipations')
      .where('audit.action = :action', { action: AuditAction.CONTRACT_EVENT })
      .andWhere('audit.epochNumber = :epoch', { epoch: targetEpoch })
      .andWhere('audit.participantAddress IS NOT NULL')
      .andWhere('audit.contributionXp > :minXp', { minXp: 0 })
      .groupBy('audit.participantAddress')
      .orderBy('totalXp', 'DESC')
      .limit(100)
      .getRawMany();

    const enriched = await Promise.all(
      entries.map(async (row: any, index: number) => {
        const proofResult = await this.getProof(row.address, targetEpoch);
        const proof = proofResult?.entries[0]?.proof ?? null;

        return {
          rank: index + 1,
          address: row.address,
          totalXp: Number(row.totalXp),
          claimsSettled: Number(row.claimsSettled),
          valuationsProvided: Number(row.valuationsProvided),
          governanceParticipations: Number(row.governanceParticipations),
          proof,
          sourceTxHash: proofResult?.entries[0]?.txHash ?? null,
        };
      }),
    );

    return enriched;
  }

  extractContribution(event: ContractEvent): ContributionExtraction {
    const data = event.data || {};
    const action = event.action;
    const contract = event.contract;

    if (contract === 'claims' && action === 'settled') {
      return {
        address: (data.claimant as string) || event.address || null,
        xp: Math.max(1, Math.floor((data.amount as number) / 1_000_000)),
      };
    }

    if (contract === 'risk_pool') {
      if (action === 'deposit') {
        return {
          address: (data.provider as string) || event.address || null,
          xp: Math.max(1, Math.floor((data.amount as number) / 1_000_000) * 2),
        };
      }
      if (action === 'withdraw') {
        return {
          address: (data.provider as string) || event.address || null,
          xp: 1,
        };
      }
      if (action === 'payout') {
        return {
          address: (data.recipient as string) || event.address || null,
          xp: 3,
        };
      }
    }

    if (contract === 'governance' && action === 'vote') {
      return {
        address: (data.voter as string) || event.address || null,
        xp: 5,
      };
    }

    if (contract === 'oracle' && action === 'ValuationUpdated') {
      return {
        address: event.address || null,
        xp: 10,
      };
    }

    return { address: event.address || null, xp: 0 };
  }

  getEpochNumberFromBlock(blockNumber: number): number {
    const ts = blockNumber * 5_000 + Date.now();
    return getEpochNumber(ts);
  }

  async rebuildEpochAccumulator(epochNumber: number): Promise<string | null> {
    const entries = await this.auditRepo.find({
      where: {
        action: AuditAction.CONTRACT_EVENT,
        epochNumber,
        chainHash: Not(IsNull()),
      },
      order: { id: 'ASC' },
    });

    const leaves = entries.map((e) => e.chainHash as string);
    const root = this.computeMerkleRoot(leaves);

    let epoch = await this.epochRepo.findOne({ where: { epoch: epochNumber } });
    if (!epoch) {
      const startedAt = new Date(EPOCH_START + (epochNumber - 1) * WEEK_MS);
      const endedAt = new Date(startedAt.getTime() + WEEK_MS);
      epoch = this.epochRepo.create({
        epoch: epochNumber,
        merkleRoot: root,
        actionCount: leaves.length,
        startedAt,
        endedAt,
      });
    } else {
      epoch.merkleRoot = root;
      epoch.actionCount = leaves.length;
    }

    await this.epochRepo.save(epoch);
    return root;
  }

  private hashLeaf(value: string): string {
    return this.simpleHash(value);
  }

  private hashNode(left: string, right: string): string {
    return this.simpleHash(`${left}:${right}`);
  }

  private computeMerkleRoot(leaves: string[]): string {
    if (leaves.length === 0) return '';
    if (leaves.length === 1) return this.hashLeaf(leaves[0]);

    let current = leaves.map((l) => this.hashLeaf(l));

    while (current.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = current[i + 1] ?? left;
        next.push(this.hashNode(left, right));
      }
      current = next;
    }

    return current[0];
  }

  private computeProof(leaves: string[], index: number): {
    leaf: string;
    proof: string[];
    leafIndex: number;
    root: string;
    verified: boolean;
  } | null {
    if (leaves.length === 0 || index < 0 || index >= leaves.length) {
      return null;
    }

    const leaf = this.hashLeaf(leaves[index]);
    const proof: string[] = [];
    let current = leaves.map((l) => this.hashLeaf(l));
    let currentIndex = index;

    while (current.length > 1) {
      const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
      const sibling = siblingIndex < current.length ? current[siblingIndex] : current[currentIndex];
      proof.push(sibling);
      currentIndex = Math.floor(currentIndex / 2);

      const next: string[] = [];
      for (let i = 0; i < current.length; i += 2) {
        const left = current[i];
        const right = current[i + 1] ?? left;
        next.push(this.hashNode(left, right));
      }
      current = next;
    }

    const root = current[0] || '';

    return {
      leaf,
      proof,
      leafIndex: index,
      root,
      verified: true,
    };
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

  private async getLatestClosedEpoch(): Promise<LeaderboardEpoch | null> {
    return this.epochRepo.findOne({
      where: { endedAt: Not(IsNull()) },
      order: { epoch: 'DESC' },
    });
  }
}
