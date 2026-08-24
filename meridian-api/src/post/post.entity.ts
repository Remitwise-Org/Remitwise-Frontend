// import { CreateUserDto } from 'src/users/dtos/create-user.dto';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  ManyToOne,
  ManyToMany,
  JoinTable,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { postType } from './Enums/post-type.enum';
import { PostStatus } from './Enums/post-status.enum';
import { MetaOption } from 'src/metaoption/metaoption.entity';
import { User } from 'src/users/user.entity';
import { Tag } from 'src/tag/tag.entity';

@Entity()
@Index(['authorId', 'postType', 'postStatus'])
export class Post {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar')
  title: string;

  // doing a manytoOne releationship btw post entity and user
  @ManyToOne(() => User, (user) => user.posts, { eager: true })
  author: User;

  @Column({ type: 'enum', enum: postType, default: postType.STORY })
  postType: postType;

  @Column({ type: 'enum', enum: PostStatus, default: PostStatus.DRAFT })
  postStatus: PostStatus;

  @Column('varchar')
  content: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' }) // Default value
  publishedDate?: Date;

  // @Column('text', { array: true, nullable: true })
  // tags: string[];

  //post is having a onetoone releationship with metaoption
  // cascade true means that if u update,delete,remove (post) it also happens to metaoption
  //   @OneToOne(() => MetaOption, {cascade:true, eager:true})
  //   @JoinColumn()
  //     MetaOption?:MetaOption
  // }

  //doing a bi-directional relationship involving both meta and post on line 51
  @OneToOne(() => MetaOption, (metaOptions) => metaOptions.post, {
    cascade: true,
    eager: true,
  })
  metaOptions?: MetaOption;

  // doing many to many btw post and tag and is a unidirectional
  // only the author knows about the tag
  @ManyToMany(() => Tag, (tags) => tags.post)
  @JoinTable()
  tags: Tag[];

  // Soft-delete marker (issue #427): when set the row is hidden from queries
  @DeleteDateColumn()
  deletedAt?: Date;

  // the joincolumn when used if you check your pg a new column is created shwoing Id of metaoption entity
  // id of metaooptons is joined with Post
}
