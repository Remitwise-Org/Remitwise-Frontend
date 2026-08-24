import { SetMetadata } from '@nestjs/common';
import { AUTH_TYPE_kEY } from 'src/auth/constant/auth-constant';
import { AuthType } from 'src/auth/enums/auth-type.enum';

export const Auth = (...authtype: AuthType[]) =>
  SetMetadata(AUTH_TYPE_kEY, authtype);

//when file is install this is what u will see
// export const Auth = (...args: string[]) => SetMetadata('auth', args);
