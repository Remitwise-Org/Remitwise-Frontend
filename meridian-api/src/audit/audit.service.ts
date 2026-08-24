import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { AuditLog, AuditAction } from './audit-log.entity';
import { CorrelationIdStore } from '../common/correlation/correlation-id.store';

export interface AuditContext {
  entityName: string;
  entityId?: string | number | null;
  action: AuditAction;
  performedById?: number | null;
  performedByEmail?: string | null;
  previousValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  correlationId?: string | null;
}

export interface ContractEventContext {
  txHash: string;
  contract: string;
  contractAction: string;
  blockNumber: number;
  rawEvent?: Record<string, unknown> | null;
  entityName?: string;
  entityId?: string | null;
  performedById?: number | null;
  performedByEmail?: string | null;
  participantAddress?: string | null;
  contributionXp?: number;
  epochNumber?: number | null;
  stateRoot?: string | null;
  correlationId?: string | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
    private readonly correlationIdStore: CorrelationIdStore,
  ) {}

  private resolveCorrelationId(explicit?: string | null): string | null {
    return explicit ?? this.correlationIdStore.get() ?? null;
  }

  async log(ctx: AuditContext): Promise<void> {
    const correlationId = this.resolveCorrelationId(ctx.correlationId);
    this.logger.log(
      JSON.stringify({
        msg: 'audit.log',
        entityName: ctx.entityName,
        action: ctx.action,
        correlationId,
      }),
    );
    const entry = this.auditRepo.create({
      entityName: ctx.entityName,
      entityId: ctx.entityId != null ? String(ctx.entityId) : null,
      action: ctx.action,
      performedById: ctx.performedById ?? null,
      performedByEmail: ctx.performedByEmail ?? null,
      previousValues: ctx.previousValues ?? null,
      newValues: ctx.newValues ?? null,
      ipAddress: ctx.ipAddress ?? null,
      correlationId,
    });
    await this.auditRepo.save(entry);
  }

  async logContractEvent(ctx: ContractEventContext): Promise<AuditLog> {
    const previousEntry = await this.auditRepo.findOne({
      where: { action: AuditAction.CONTRACT_EVENT },
      order: { id: 'DESC' },
    });

    const previousHash = previousEntry?.chainHash ?? null;
    const payload = `${ctx.txHash}:${ctx.contract}:${ctx.contractAction}:${ctx.blockNumber}:${JSON.stringify(ctx.rawEvent || {})}:${previousHash ?? ''}`;
    const chainHash = createHash('sha256').update(payload).digest('hex');

    const correlationId = this.resolveCorrelationId(ctx.correlationId);
    this.logger.log(
      JSON.stringify({
        msg: 'audit.contract_event',
        txHash: ctx.txHash,
        contract: ctx.contract,
        correlationId,
      }),
    );

    const entry = this.auditRepo.create({
      entityName: ctx.entityName || ctx.contract,
      entityId: ctx.entityId ?? null,
      action: AuditAction.CONTRACT_EVENT,
      correlationId,
      txHash: ctx.txHash,
      contract: ctx.contract,
      contractAction: ctx.contractAction,
      blockNumber: ctx.blockNumber,
      previousHash,
      chainHash,
      stateRoot: ctx.stateRoot ?? null,
      rawEvent: ctx.rawEvent ?? null,
      participantAddress: ctx.participantAddress ?? null,
      contributionXp: ctx.contributionXp ?? 0,
      epochNumber: ctx.epochNumber ?? null,
    });
    return this.auditRepo.save(entry);
  }
}
