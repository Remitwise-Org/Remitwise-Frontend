import {
  IsArray,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PostStatus } from '../Enums/post-status.enum';
import { postType } from '../Enums/post-type.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CreatePostMetaOptionsDto } from 'src/metaoption/dto/create-post-meta-options.dto';

export class CreatePostDto {
  @ApiProperty({
    description: 'the tittle must be a string',
    example: 'jane Doe',
  })
  @IsString()
  @MinLength(4)
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'ID of the author user',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  authorId: number;

  @ApiProperty({
    enum: postType,
    description: 'possible value are series,story,post,page',
  })
  @IsEnum(postType)
  postType: postType;

  @ApiProperty({
    enum: PostStatus,
    description: 'possible value are review,schedule,draft,publish ',
  })
  @IsEnum(PostStatus)
  PostStatus: PostStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  content: string;

  @ApiPropertyOptional({
    description: 'URL of the featured image for the post',
    example: 'https://example.com/image.png',
  })
  @IsString()
  @IsOptional()
  imageUrl: string;

  @ApiPropertyOptional({
    description: 'ISO8601 formatted publication date',
    example: '2026-06-17T00:00:00.000Z',
  })
  @IsISO8601()
  @IsOptional()
  @Type(() => Date)
  publishedDate: Date;

  @ApiProperty({
    description: 'Array of tag IDs associated with this post',
    example: [1, 2],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  tags: number[];

  @ApiPropertyOptional({
    type: CreatePostMetaOptionsDto,
    description: 'Metadata options for the post',
  })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePostMetaOptionsDto)
  metaOptions?: CreatePostMetaOptionsDto | null;
}
