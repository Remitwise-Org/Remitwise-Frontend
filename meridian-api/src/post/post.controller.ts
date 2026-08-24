import {
  Body,
  Controller,
  Delete,
  Patch,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PostsService } from './provider/post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PatchPostDto } from './dto/patch-post.dto';
import { GetPostsDto } from './dto/get-posts.dto';
import { RequirePermissions } from 'src/auth/decorators/permissions/permissions.decorator';
import { Permission } from 'src/auth/enums/permission.enum';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostsService) {}

  @Get('/:id?')
  @ApiOperation({
    summary: 'Fetch all posts with optional filtering and pagination',
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved posts' })
  public getPosts(@Query() getPostDto: GetPostsDto) {
    return this.postService.FindAllposts(getPostDto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / Validation failure' })
  @ApiResponse({ status: 401, description: 'Unauthorized — a valid token is required' })
  @RequirePermissions(Permission.POSTS_CREATE)
  @ApiBearerAuth()
  public Createpost(@Body() createpostdto: CreatePostDto) {
    // console.log(createpostdto instanceof CreatePostDto)
    return this.postService.createPost(createpostdto);
  }

  @Delete()
  @ApiOperation({ summary: 'Soft-delete a post (issue #427)' })
  @ApiResponse({ status: 200, description: 'Post soft-deleted successfully' })
  public deleteOne(@Query('id', ParseIntPipe) id: number) {
    return this.postService.deleteOne(id);
  }

  @Post('/:id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted post by ID' })
  @ApiResponse({ status: 200, description: 'Post restored successfully' })
  @ApiResponse({
    status: 404,
    description: 'Post not found or not soft-deleted',
  })
  public restorePost(@Param('id', ParseIntPipe) id: number) {
    return this.postService.restorePost(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update an existing post' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / Validation failure' })
  public updatePostTag(@Body() patchPostDto: PatchPostDto) {
    return this.postService.UpdatePost(patchPostDto);
  }
}
