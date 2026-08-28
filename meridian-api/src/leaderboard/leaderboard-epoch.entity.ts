import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('leaderboard_epochs')
@Index(['epoch'], { unique: true })
export class LeaderboardEpoch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', unique: true })
  epoch: number;

  @Column({ type: 'varchar', length: 128, unique: true })
  merkleRoot: string;

  @Column({ type: 'int', default: 0 })
  actionCount: number;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp' })
  endedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
