import { Injectable } from '@nestjs/common';
import { HashingProvider } from 'src/auth/providers/hashing';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BcryptProvider implements HashingProvider {
  //hash
  // generate salt

  public async hashPassword(data: string | Buffer): Promise<string> {
    // generate salt
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(data, salt);
  }

  // compare password
  public async comparePassword(
    data: string | Buffer,
    encypted: string,
  ): Promise<boolean> {
    return bcrypt.compare(data, encypted);
  }
}
