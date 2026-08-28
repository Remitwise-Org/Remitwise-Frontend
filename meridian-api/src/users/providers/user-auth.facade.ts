import { Injectable } from '@nestjs/common';
import { FindOneByEmail } from './find-one-by-email';
import { User } from '../user.entity';

@Injectable()
export class UserAuthFacade {
  constructor(private readonly findOneByEmail: FindOneByEmail) {}

  public async findUserByEmail(email: string): Promise<User> {
    return this.findOneByEmail.findOneByEmail(email);
  }
}
