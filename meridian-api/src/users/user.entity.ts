import { Exclude } from 'class-transformer';
import { Post } from 'src/post/post.entity';
import { Tweet } from 'src/tweets/entities/tweet.entity';
import { Role } from 'src/auth/enums/role.enum';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  OneToOne,
  JoinColumn,
  DeleteDateColumn,
  Index,
} from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 100, nullable: false })
  firstName: string;

  @Column('varchar', { length: 100 })
  lastName: string;

  @Index()
  @Column('varchar', { unique: true, nullable: false })
  email: string;

  @Exclude()
  @Column('varchar', { nullable: false })
  password: string;

  // doing a one to many releatinship btw users entity and post entity
  @OneToMany(() => Post, (posts) => posts.author)
  posts: Post[];

  @OneToMany(() => Tweet, (tweet) => tweet.user)
  tweet: Tweet[];

  // Soft-delete marker (issue #427): when set the row is hidden from queries
  // but can be restored via POST /users/:id/restore
  @DeleteDateColumn()
  deletedAt?: Date;

  // Email verification (issue #435): the gate for POST /auth/sign-in. While
  // `false`, the user is presumed not yet activated; the 403 gate in
  // SignInProviders asks them to verify their email first rather than
  // leaking whether their password was right.
  @Column({ default: false })
  emailVerified: boolean;

  // RBAC role (issue #632): defaults to USER; promoted to VERIFIED_USER on
  // email verification and managed by admins/moderators via the role
  // management endpoints. Stored as a varchar so pre-RBAC rows migrate
  // cleanly via the dedicated migration.
  @Column('varchar', { length: 32, default: Role.USER })
  role: Role;

  @Exclude()
  @Column('varchar', { nullable: true })
  emailVerificationToken: string | null;

  @Exclude()
  @Column('datetime', { nullable: true })
  emailVerificationExpires: Date | null;

  // Envelope encryption (issue #631): id of this user's Data Encryption
  // Key (DEK) in `data_encryption_keys`; `encryptedData` holds the JSON
  // envelope(s) of reversibly-encrypted sensitive fields (e.g. the
  // verification-token plaintext) encrypted under that DEK.
  @Exclude()
  @Column('uuid', { nullable: true })
  dataEncryptionKeyId: string | null;

  @Exclude()
  @Column('text', { nullable: true })
  encryptedData: string | null;

  // @Column({ default: true })
  // isActive: boolean;

  //   @OneToMany(type => Photo, photo => photo.user)
  //   photos: Photo[];
}
