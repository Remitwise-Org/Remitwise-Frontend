import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuditAction {
  CREATE = 'CREATE',
  READ = 'READ',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  CONTRACT_EVENT = 'CONTRACT_EVENT',
}

@Entity('audit_logs')
@Index(['entityName', 'entityId'])
@Index(['performedById'])
@Index(['txHash'])
@Index(['contract', 'contractAction'])
@Index(['blockNumber'])
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  entityName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  entityId: string | null;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ type: 'int', nullable: true })
  performedById: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  performedByEmail: string | null;

  @Column({ type: 'json', nullable: true })
  previousValues: Record<string, unknown> | null;

  @Column({ type: 'json', nullable: true })
  newValues: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'varchar', length: 128, nullable: true, unique: true })
  txHash: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contract: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contractAction: string | null;

  @Column({ type: 'bigint', nullable: true })
  blockNumber: number | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  previousHash: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  chainHash: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  stateRoot: string | null;

  @Column({ type: 'json', nullable: true })
  rawEvent: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  participantAddress: string | null;

  @Column({ type: 'int', default: 0 })
  contributionXp: number;

  @Column({ type: 'int', nullable: true })
  epochNumber: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  @Index()
  correlationId: string | null;
}
