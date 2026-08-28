import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Tag } from './tag.entity';
import { In, Repository } from 'typeorm';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag) private readonly tagRepository: Repository<Tag>,
  ) {}

  public async findMultiTag(tags: number[]) {
    const result = this.tagRepository.find({
      where: { id: In(tags) },
    });
    return result;
  }

  public async createTag(createTagDto: CreateTagDto) {
    const tag = this.tagRepository.create(createTagDto);

    return await this.tagRepository.save(tag);
  }
}
