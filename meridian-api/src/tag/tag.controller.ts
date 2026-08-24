import { Body, Controller, Post } from '@nestjs/common';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Controller('tag')
export class TagController {
  constructor(private readonly tagService: TagsService) {}

  @Post()
  public createTag(@Body() CreateTagDto: CreateTagDto) {
    return this.tagService.createTag(CreateTagDto);
  }
}
