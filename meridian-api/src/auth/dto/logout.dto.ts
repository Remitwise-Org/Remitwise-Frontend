import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LogoutDto {
  @ApiProperty({
    description: 'The refresh token to revoke',
    example: 'eyJ...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
