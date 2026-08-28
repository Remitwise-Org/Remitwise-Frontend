import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
  Patch,
  UseInterceptors,
  ClassSerializerInterceptor,
  Logger,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { GetuserParamDto } from './dto/user-param.dto';
import { UserService } from './providers/user.services';
import { EditUserDto } from './dto/patch-user.dto';
import {
  ApiResponse,
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RequireRoles } from 'src/auth/decorators/roles/roles.decorator';
import { RequirePermissions } from 'src/auth/decorators/permissions/permissions.decorator';
import { Role } from 'src/auth/enums/role.enum';
import { Permission } from 'src/auth/enums/permission.enum';
import { CreateManyUsersDto } from './dto/create-many-users.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UserPermissionQueryDto } from './dto/user-permission-query.dto';

@Controller('users')
// line 14 is a method
// TO GEt users
@ApiTags('Users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  // performing an dependencies injection online 17
  constructor(private readonly userService: UserService) {}

  // doing validation with pipes on line 33 to 34
  // http://localhost:3000/users/23333?search=John&role=admin
  // to search on url for params and query

  // performing api description for @Get which displays in our swagger in the browser
  @ApiResponse({
    status: 200,
    description: 'users fetched successfully based on the query',
  })
  @ApiOperation({
    summary: 'Fetch all the users',
  })

  // Requires USERS_READ, which is intentionally NOT granted to Role.USER:
  // email verification promotes USER → VERIFIED_USER (which holds USERS_READ)
  // and sign-in is gated on emailVerified, so every logged-in user has it.
  @Get('/:id?')
  @ApiQuery({
    name: 'limit',
    type: 'number',
    required: false,
    description: 'the number of entries returned per query',
  })
  @ApiQuery({
    name: 'page',
    type: 'number',
    required: false,
    description: 'the page number of entries returned per query',
  })
  @RequirePermissions(Permission.USERS_READ)
  @ApiBearerAuth()
  public getUsers(
    @Param() getuserParamDto: GetuserParamDto,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    this.logger.debug(
      JSON.stringify({ msg: 'users.getUsers', params: getuserParamDto }),
    );
    return this.userService.findAll(getuserParamDto, limit, page);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden — moderator or admin only' })
  @UseInterceptors(ClassSerializerInterceptor)
  @RequireRoles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  public createUsers(@Body() createUserDto: CreateUserDto) {
    // console.log(createUserDto instanceof CreateUserDto)
    return this.userService.createUsers(createUserDto);
  }

  @Post('/many-users')
  @ApiOperation({ summary: 'Create multiple users' })
  @ApiResponse({ status: 201, description: 'Users created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @RequireRoles(Role.MODERATOR, Role.ADMIN)
  @ApiBearerAuth()
  public createMany(@Body() createManyUserDto: CreateManyUsersDto) {
    return this.userService.createMany(createManyUserDto);
  }

  @Delete('/:id')
  @ApiOperation({ summary: 'Soft-delete a user by ID (issue #427)' })
  @ApiResponse({ status: 200, description: 'User soft-deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  @RequireRoles(Role.ADMIN)
  @ApiBearerAuth()
  public deleteUsers(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteUser(id);
  }

  /**
   * Admin-only: assign (or demote) a user's role (issue #632).
   * Role changes take effect on the user's next sign-in since the JWT is
   * stateless — access tokens already issued keep their previous claims.
   */
  @Post('/:id/role')
  @ApiOperation({ summary: 'Assign a role to a user (admin only, issue #632)' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @RequirePermissions(Permission.USERS_MANAGE_ROLES)
  @ApiBearerAuth()
  public assignRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignRoleDto: AssignRoleDto,
  ) {
    return this.userService.assignRole(id, assignRoleDto.role);
  }

  /**
   * Admin-only: return the resolved permission list for a user (issue #632).
   */
  @Get('/:id/permissions')
  @ApiOperation({
    summary: 'Get a user\'s role and resolved permissions (admin only, issue #632)',
  })
  @ApiResponse({ status: 200, description: 'Role and permissions returned' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin only' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @RequireRoles(Role.ADMIN)
  @ApiBearerAuth()
  public getUserPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: UserPermissionQueryDto,
  ) {
    return this.userService.getUserPermissions(id, query.permission);
  }

  @Post('/:id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted user by ID' })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({
    status: 404,
    description: 'User not found or not soft-deleted',
  })
  @RequirePermissions(Permission.USERS_UPDATE)
  @ApiBearerAuth()
  public restoreUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.restoreUser(id);
  }

  @Patch()
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @RequirePermissions(Permission.USERS_UPDATE)
  @ApiBearerAuth()
  public editedPost(@Body() edituserDto: EditUserDto) {
    return this.userService.editUser(edituserDto);
  }

  @Post('/with-book')
  @ApiOperation({ summary: 'Create user with a default book entry' })
  @ApiResponse({
    status: 201,
    description: 'User and book created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @RequirePermissions(Permission.USERS_CREATE)
  @ApiBearerAuth()
  public createUserWithBook(@Body() userDto: CreateUserDto) {
    return this.userService.createUserWithBook(userDto);
  }

  @Get('/with-book')
  @ApiOperation({ summary: 'Fetch all users with their books' })
  @ApiResponse({
    status: 200,
    description: 'List of users with books retrieved successfully',
  })
  @RequirePermissions(Permission.USERS_READ)
  @ApiBearerAuth()
  public getAllUsersWithBook() {
    return this.userService.getAllUserWithBook();
  }

  @Get('find/:id')
  @ApiOperation({ summary: 'Fetch a single user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @RequirePermissions(Permission.USERS_READ)
  @ApiBearerAuth()
  public getUserbyId(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOneById(id);
  }
}
