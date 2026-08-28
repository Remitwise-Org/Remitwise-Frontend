import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/create-user.dto';
import { DataSource } from 'typeorm';
import { User } from '../user.entity';
import { CreateManyUsersDto } from '../dto/create-many-users.dto';

@Injectable()
export class CreateManyUser {
  constructor(
    //injectining data Source
    private readonly dataSource: DataSource,
  ) {}

  public async manyUsers(createManyUserDto: CreateManyUsersDto) {
    //create Queryrunner Instance
    const queryRunnner = this.dataSource.createQueryRunner();
    // connect Queryrunner to data Source
    await queryRunnner.connect();
    // start transaction
    await queryRunnner.startTransaction();
    const newUsers: User[] = [];
    try {
      for (const user of createManyUserDto.users) {
        const newUser = queryRunnner.manager.create(User, user);
        const result = await queryRunnner.manager.save(newUser);
        newUsers.push(result);
      }

      //when suncessfull commit
      await queryRunnner.commitTransaction();
    } catch (error) {
      // when unsucessfull rollback
      // when there is an error start from begning or cancel
      await queryRunnner.rollbackTransaction();
    } finally {
      // release transaction
      await queryRunnner.release();
    }

    return newUsers;
  }
}
