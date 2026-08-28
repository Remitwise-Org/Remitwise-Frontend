// import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { Observable } from 'rxjs';
// import { AUTH_TYPE_kEY } from 'src/auth/constant/auth-constant';
// import { AuthType } from 'src/auth/enums/auth-type.enum';
// import { AccessTokenGuard } from 'src/auth/guard/access-token/access-token.guard';

// @Injectable()
// export class AuthGuardGuard implements CanActivate {
//   private static readonly defaultOfType = AuthType.Bearer;
//   private readonly authTypeGuardMap: Record<
//     AuthType,
//     CanActivate | CanActivate[]
//   > = {
//     [AuthType.Bearer]: this.accessTokenGuard,
//     [AuthType.None]: { canActivate: () => true },
//   };

//   constructor(
//     private readonly reflector: Reflector,
//     private readonly accessTokenGuard: AccessTokenGuard,
//   ) {}

//   canActivate(
//     context: ExecutionContext,
//   ): Promise<boolean>  {
//     console.log(this.authTypeGuardMap);
//     // get all type from reflector
//     const authTypes = this.reflector.getAllAndOverride(AUTH_TYPE_kEY, [
//       context.getHandler(),
//       context.getClass(),
//     ]) ?? AuthGuardGuard.defaultOfType
//     console.log(authTypes)
//     //array of guard
//     const guards = authTypes.map(((type) => this.authTypeGuardMap[type].flat()) )
//     console.log(guards)
//     const error = new UnauthorizedException('User not Authorize')
//     //loops guards
//   //   for (const instance of guards)  await Promise.resolve {
//   //   instance.Canactivate(context)
//   //   .catch((err)  =>  {
//   //     error: err
//   //   })
//   //   if (Canactivate) {
//   //     return true;
//   //   }
//   //   throw error
//   // }

//   }
// }
