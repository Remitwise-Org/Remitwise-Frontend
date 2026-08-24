import {
  BadGatewayException,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateManyUser } from './createManyUser.Provider';
import { CreateUserDto } from '../dto/create-user.dto';
import { UserAlreadyExistException } from 'src/common/exceptions/user-already-exists.exception';

@Injectable()
export class CreateUserBookProvider {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createUserwithBook(userDto: CreateUserDto) {
    try {
      // let book = this.bookRepository.create(userDto.book);
      // await this.bookRepository.save(book)

      const existingUserwithEmail = await this.userRepository.findOne({
        where: [{ email: userDto.email }],
      });

      if (existingUserwithEmail) {
        throw new UserAlreadyExistException('email', userDto.email);
      }

      const user = this.userRepository.create({
        ...userDto,
      });
      return await this.userRepository.save(user);
    } catch (error) {
      if (error === 'ECONNREFUSED') {
        throw new BadGatewayException('An error occured duirng connection', {
          description: 'could not connect to Db',
        });
      }

      if (error === '23505') {
        throw new BadRequestException('User with this email already exising');
      }

      throw error;
    }
  }

  public async getAllUserWithBook(): Promise<User[]> {
    try {
      return await this.userRepository.find({ relations: ['book'] });
    } catch {
      throw new BadGatewayException('An error occured duirng connection', {
        description: 'could not connect to Db',
      });
    }
  }
}
