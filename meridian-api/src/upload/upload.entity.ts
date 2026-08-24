import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Upload {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'varchar',
    length: 64,
    unique: true,
    nullable: false,
  })
  contentHash: string; // SHA-256 hash of the file buffer

  @Column({
    type: 'varchar',
    length: 1024,
    nullable: false,
  })
  url: string;

  @Column({
    type: 'varchar',
    length: 256,
    nullable: false,
  })
  originalName: string;

  @Column({
    type: 'varchar',
    length: 128,
    nullable: false,
  })
  mimeType: string;

  @Column({
    type: 'integer',
    nullable: false,
  })
  size: number;

  @CreateDateColumn()
  createdAt: Date;
}
