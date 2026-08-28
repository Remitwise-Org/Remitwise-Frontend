import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateTweetDto } from './create-tweet.dto';
import { IsInt, IsNotEmpty } from 'class-validator';

export class UpdateTweetDto extends PartialType(CreateTweetDto) {
  @ApiProperty({ description: 'The ID of the tweet to update', example: 1 })
  @IsInt()
  @IsNotEmpty()
  id: number;
}
