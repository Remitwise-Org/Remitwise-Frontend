import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTweetDto {
  @ApiProperty({
    description: 'Text content of the tweet',
    example: 'Hello World!',
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(1)
  @MaxLength(280)
  text: string;

  @ApiPropertyOptional({
    description: 'Optional image URL for the tweet',
    example: 'https://example.com/tweet.png',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({
    description: 'ID of the user who is posting the tweet',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  userId: number;

  @ApiPropertyOptional({
    description: 'Optional array of hashtag IDs',
    example: [1, 2],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  Hashtags?: number[];
}
