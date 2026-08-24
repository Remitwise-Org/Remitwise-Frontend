import { Injectable } from '@nestjs/common';

@Injectable()
export abstract class HashingProvider {
  // hashing: happens during sign up
  abstract hashPassword(data: string | Buffer): Promise<string>;

  // compare:happenss during sign in
  abstract comparePassword(
    data: string | Buffer,
    encypted: string,
  ): Promise<boolean>;
}
