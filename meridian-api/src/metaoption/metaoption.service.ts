import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MetaOption } from './metaoption.entity';
import { CreatePostMetaOptionsDto } from './dto/create-post-meta-options.dto';

@Injectable()
export class MetaoptionService {
  constructor(
    @InjectRepository(MetaOption)
    private metaRepository: Repository<MetaOption>,
  ) {}

  public async createMeta(createPostMetaoption: CreatePostMetaOptionsDto) {
    const metaoption = this.metaRepository.create(createPostMetaoption);

    return await this.metaRepository.save(metaoption);
  }
}
