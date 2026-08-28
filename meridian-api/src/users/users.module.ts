import { forwardRef, Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UserService } from './providers/user.services';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { AuthModule } from 'src/auth/auth.module';
import { CreateUserProvider } from './providers/create-user.provider';
import { FindOneByEmail } from './providers/find-one-by-email';
import { CreateManyUser } from './providers/createManyUser.Provider';
import { CreateUserBookProvider } from './providers/createUserWithBook';
import { Tweet } from 'src/tweets/entities/tweet.entity';
import { TweetModule } from 'src/tweets/tweet.module';
import { UserAuthFacade } from './providers/user-auth.facade';
import { CryptoModule } from 'src/crypto/crypto.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Tweet]),
    forwardRef(() => AuthModule),
    CryptoModule,
  ],
  controllers: [UsersController],
  providers: [
    UserService,
    CreateUserProvider,
    FindOneByEmail,
    CreateManyUser,
    CreateUserBookProvider,
    UserAuthFacade,
  ],
  exports: [TypeOrmModule, UserService, UserAuthFacade],
})
export class UsersModule {}
