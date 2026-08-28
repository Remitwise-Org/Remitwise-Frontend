import { IsJSON, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostMetaOptionsDto {
  @IsNotEmpty()
  @IsJSON()
  @ApiProperty({
    description: 'Meta options key-value JSON string',
    example: '{"sidebarEnabled": true}',
  })
  metaValue: string;
}
