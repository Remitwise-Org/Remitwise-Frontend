import { HttpException, HttpStatus } from '@nestjs/common';

export class UserAlreadyExistException extends HttpException {
  constructor(fieldName: string, fieldValue: string) {
    super(
      `User with '${fieldName}' already exists with '${fieldValue}'`,
      HttpStatus.CONFLICT,
    );
  }
}
