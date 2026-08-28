import { Module } from '@nestjs/common';
import { MetaoptionController } from './metaoption.controller';
import { MetaoptionService } from './metaoption.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MetaOption } from './metaoption.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MetaOption])],
  controllers: [MetaoptionController],
  providers: [MetaoptionService],
})
export class MetaoptionModule {}
