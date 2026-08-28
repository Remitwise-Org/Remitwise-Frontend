import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  RequestTimeoutException,
} from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { Repository } from 'typeorm';
import { User } from '../user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { HashingProvider } from 'src/auth/providers/hashing';
import { MailProvider } from 'src/mail/providers/mail.provider';
import { CryptoProvider } from 'src/crypto/providers/crypto.provider';

@Injectable()
export class CreateUserProvider {
  private readonly logger = new Logger(CreateUserProvider.name);

  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,

    private readonly hashingProvider: HashingProvider,

    private readonly mailService: MailProvider,

    // Envelope encryption (issue #631): provisions the user's DEK so every
    // later sensitive value (verification token, refresh tokens) reuses it.
    private readonly cryptoProvider: CryptoProvider,
  ) {}
  public async createUsers(createUserDto: CreateUserDto) {
    // check if user already exits
    let existingUser = undefined;

    try {
      existingUser = await this.userRepository.findOne({
        where: { email: createUserDto.email },
      });
    } catch (error) {
      // you might save/log your  error
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, Please try later',
        {
          description: 'Error connecting to your database',
          cause: 'the user is using has a badnetwork',
        },
      );
    }
    // Handle Error
    if (existingUser) {
      throw new BadRequestException('User already exist');
    }
    // Provision the user's Data Encryption Key when envelope encryption is
    // enabled (issue #631). In transparent-fallback mode (no KEK configured)
    // the column stays null and nothing sensitive is stored in plaintext.
    let dataEncryptionKeyId: string | null = null;
    if (this.cryptoProvider.isEnabled()) {
      const dek = await this.cryptoProvider.createDek();
      dataEncryptionKeyId = dek.id;
    }

    // Create the user
    let newUser = this.userRepository.create({
      ...createUserDto,
      password: await this.hashingProvider.hashPassword(createUserDto.password),
      dataEncryptionKeyId,
    });
    try {
      newUser = await this.userRepository.save(newUser);
    } catch (error) {
      throw new RequestTimeoutException(
        'Unable to process your request at the moment, Please try later',
        {
          description: 'Error connecting to your database',
          cause: 'the user is using Glo network',
        },
      );
    }

    // Link the DEK row to the user for auditability (best-effort).
    if (dataEncryptionKeyId) {
      try {
        await this.cryptoProvider.attachDekToUser(dataEncryptionKeyId, newUser.id);
      } catch (error) {
        this.logger.warn(
          `Failed to link DEK ${dataEncryptionKeyId} to user ${newUser.id}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    try {
      await this.mailService.WelcomeEmail(newUser);
    } catch (error) {
      // throw new RequestTimeoutException('user already exist')
    }
    return [newUser];
  }
}
