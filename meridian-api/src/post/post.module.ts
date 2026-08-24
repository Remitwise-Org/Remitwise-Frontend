import { Module } from '@nestjs/common';
import { PostController } from './post.controller';
import { PostsService } from './provider/post.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Post } from './post.entity';
// import { MetaOption } from 'src/metaoption/metaoption.entity';
// import { UserService } from 'src/users/providers/user.services';
import { UsersModule } from 'src/users/users.module';
import { TagModule } from 'src/tag/tag.module';
import { PaginationModule } from 'src/common/pagination/pagination.module';
// import { TagsService } from 'src/tag/tags.service';

@Module({
  imports: [
    UsersModule,
    TagModule,
    TypeOrmModule.forFeature([Post]),
    PaginationModule,
  ],
  controllers: [PostController],
  providers: [PostsService],
  exports: [TypeOrmModule],
})
export class PostModule {}
