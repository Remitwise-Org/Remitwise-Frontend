import { Body, Controller, Post } from '@nestjs/common';
import { MetaoptionService } from './metaoption.service';
import { CreatePostMetaOptionsDto } from './dto/create-post-meta-options.dto';

@Controller('meta-options')
export class MetaoptionController {
  constructor(private readonly metaService: MetaoptionService) {}

  @Post()
  public createMeta(createPostMetadto: CreatePostMetaOptionsDto) {
    return this.metaService.createMeta(createPostMetadto);
  }
}
