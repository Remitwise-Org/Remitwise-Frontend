import { Module } from '@nestjs/common';
import { TagController } from './tag.controller';
import { TagsService } from './tags.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tag } from './tag.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Tag])],
  controllers: [TagController],
  providers: [TagsService],
  exports: [TypeOrmModule, TagsService],
})
export class TagModule {}
