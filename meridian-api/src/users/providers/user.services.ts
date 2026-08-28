import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { GetPostsParamDto } from 'src/post/dto/post-param.dto';
import { EditUserDto } from '../dto/patch-user.dto';
import { CreateUserProvider } from './create-user.provider';
import { FindOneByEmail } from './find-one-by-email';
import { CreateManyUser } from './createManyUser.Provider';
import { CreateManyUsersDto } from '../dto/create-many-users.dto';
import { CreateUserBookProvider } from './createUserWithBook';
import { HashingProvider } from 'src/auth/providers/hashing';
import { Role } from 'src/auth/enums/role.enum';
import { Permission } from 'src/auth/enums/permission.enum';
import { ROLE_PERMISSIONS } from 'src/auth/enums/role-permissions';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/audit-log.entity';

export interface PerformerIdentity {
  userId: number;
  email: string;
  ipAddress?: string | null;
}

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,

    //dependecy injection for createUser Provider
    private readonly createuserprovider: CreateUserProvider,

    //dependecy injection for findoneByemail Provider
    private readonly findOneByemail: FindOneByEmail,

    private readonly createUserWithBooks: CreateUserBookProvider,

    // depedency injection of createManyUsers
    private readonly createManyUserService: CreateManyUser,

    // one-way hashing for password writes (issue #631 keeps passwords hashed
    // while CryptoProvider handles reversible encryption).
    private readonly hashingProvider: HashingProvider,

    private readonly auditService: AuditService,
  ) {}
  // repository pattern that help commiunicate with the Database
  // just by doing this we have injected a repository pattern

  public findAll(
    getUserParamDto: GetPostsParamDto,
    limit: number,
    page: number,
  ): Promise<User[]> {
    return this.usersRepository.find();
  }

  // inject Hasingprovider

  public async createUsers(createUserDto: CreateUserDto) {
    return this.createuserprovider.createUsers(createUserDto);
  }

  public async GetOneByEmail(email: string) {
    //fineoneby email first one is provider second a method in the provider
    return await this.findOneByemail.findOneByEmail(email);
  }

  /**
   * Soft-deletes a user (issue #427). TypeORM will hide the row from
   * subsequent `find*` queries; use `restoreUser` to undo.
   *
   * Audit records capture the previous state (non-sensitive fields only)
   * and the performer identity for traceability.
   */
  public async deleteUser(id: number, performer?: PerformerIdentity) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `User with id ${id} not found`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const previousValues = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    await this.usersRepository.softDelete(id);

    await this.safeAudit({
      entityName: 'User',
      entityId: String(id),
      action: AuditAction.DELETE,
      performedById: performer?.userId ?? null,
      performedByEmail: performer?.email ?? null,
      ipAddress: performer?.ipAddress ?? null,
      previousValues,
      newValues: { deleted: true },
    });

    return { deleted: true, id };
  }

  /**
   * Restores a soft-deleted user, clearing its `deletedAt` value.
   * Audit records capture the restoration event with performer identity.
   */
  public async restoreUser(id: number, performer?: PerformerIdentity) {
    const result = await this.usersRepository.restore(id);

    if (!result.affected) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `User with id ${id} was not found or is not soft-deleted`,
        },
        HttpStatus.NOT_FOUND,
      );
    }

    const restoredUser = await this.usersRepository.findOneBy({ id });

    await this.safeAudit({
      entityName: 'User',
      entityId: String(id),
      action: AuditAction.UPDATE,
      performedById: performer?.userId ?? null,
      performedByEmail: performer?.email ?? null,
      ipAddress: performer?.ipAddress ?? null,
      previousValues: { deleted: true },
      newValues: {
        restored: true,
        role: restoredUser?.role ?? null,
      },
    });

    return { restored: true, id };
  }

  //finding users by id and userservice was exported in postmodule i.e export:[typeorm,userservice]
  public async findOneId(id: number): Promise<User | null> {
    const user = await this.usersRepository.findOneBy({ id });

    if (!user) {
      throw new HttpException(
        {
          status: HttpStatus.NOT_FOUND,
          error: `User with id ${id} not found`,
          table: 'User',
        },
        HttpStatus.NOT_FOUND,
        {
          description: `User with the given id ${id} was not found`,
        },
      );
    }

    return user;
  }

  // editing user
  public async editUser(edituserDto: EditUserDto) {
    const edit = await this.usersRepository.findOneBy({
      id: edituserDto.id,
    });

    edit.firstName = edituserDto.firstName ?? edit.firstName;
    edit.lastName = edituserDto.lastName ?? edit.lastName;
    if (edituserDto.password) {
      // Hash before persisting — a password must never be written in the clear.
      edit.password = await this.hashingProvider.hashPassword(
        edituserDto.password,
      );
    }
    edit.email = edituserDto.email ?? edit.email;

    return this.usersRepository.save(edit);
  }

  public async createMany(createManyUserDto: CreateManyUsersDto) {
    return await this.createManyUserService.manyUsers(createManyUserDto);
  }

  //PRACTCE FOR ONE TO ONE RELATIONSHIP BTW USER AND BOOK ENTITY
  public async createUserWithBook(userDto: CreateUserDto) {
    return await this.createUserWithBooks.createUserwithBook(userDto);
  }

  public async getAllUserWithBook() {
    return await this.createUserWithBooks.getAllUserWithBook();
  }

  public async findOneById(id: number) {
    return await this.usersRepository.findOneBy({ id });
  }

  /**
   * RBAC (issue #632): assign a new role to a user. Throws 404 when the user
   * does not exist. Role changes take effect on the user's next sign-in since
   * the stateless JWT keeps its original claims until then.
   *
   * Audit records capture previous and new role for traceability.
   */
  public async assignRole(
    id: number,
    role: Role,
    performer?: PerformerIdentity,
  ) {
    const user = await this.findOneId(id);
    const previousRole = user.role;
    user.role = role;
    await this.usersRepository.save(user);

    await this.safeAudit({
      entityName: 'User',
      entityId: String(id),
      action: AuditAction.UPDATE,
      performedById: performer?.userId ?? null,
      performedByEmail: performer?.email ?? null,
      ipAddress: performer?.ipAddress ?? null,
      previousValues: { role: previousRole },
      newValues: { role: user.role },
    });

    return {
      id: user.id,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] ?? [],
    };
  }

  /**
   * RBAC (issue #632): resolve a user's permission list from their role.
   * Optionally filter down to a single permission for "does user have X?"
   * checks. Throws 404 when the user does not exist.
   */
  public async getUserPermissions(id: number, permission?: Permission) {
    const user = await this.findOneId(id);
    const role = user.role ?? Role.USER;
    const permissions = ROLE_PERMISSIONS[role] ?? [];
    const filtered = permission
      ? permissions.filter((p) => p === permission)
      : permissions;
    return { id: user.id, role, permissions: filtered };
  }

  /**
   * Fire-and-forget audit logging for privileged operations. Failures are
   * caught and logged but never propagate to the caller.
   */
  private async safeAudit(ctx: {
    entityName: string;
    entityId: string;
    action: AuditAction;
    performedById: number | null;
    performedByEmail: string | null;
    ipAddress?: string | null;
    previousValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
  }): Promise<void> {
    try {
      await this.auditService.log(ctx);
    } catch (err) {
      this.logger.error(
        JSON.stringify({
          msg: 'audit.write_failed',
          entityName: ctx.entityName,
          entityId: ctx.entityId,
          action: ctx.action,
          error: err instanceof Error ? err.message : String(err),
        }),
      );
    }
  }
}
