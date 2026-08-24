import { Exclude } from 'class-transformer';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('webhooks')
@Index(['address', 'contract'])
@Index(['isActive'])
export class Webhook {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  url: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contract: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  action: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  // Envelope encryption (issue #631): legacy rows keep the plaintext secret
  // here; new rows set it to null and store the encrypted envelope in
  // `encryptedData` instead. `dataEncryptionKeyId` references the DEK that
  // encrypted it.
  @Column({ type: 'varchar', length: 128, nullable: true })
  secret: string | null;

  @Exclude()
  @Column({ type: 'uuid', nullable: true })
  dataEncryptionKeyId: string | null;

  @Exclude()
  @Column({ type: 'text', nullable: true })
  encryptedData: string | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  failureCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastTriggeredAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
