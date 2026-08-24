import { Post } from 'src/post/post.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class MetaOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'json',
    nullable: false,
  })
  metaValue: string;

  // performing the bi-directional relationship involving post and metaoption entity
  @OneToOne(() => Post, (post) => post.metaOptions, { onDelete: 'CASCADE' })
  @JoinColumn()
  post: Post;

  @CreateDateColumn()
  createDate: Date;

  @UpdateDateColumn()
  updateDate: Date;
}
