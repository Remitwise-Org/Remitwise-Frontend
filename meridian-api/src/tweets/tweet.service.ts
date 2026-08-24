import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Tweet } from './entities/tweet.entity';
import { Repository } from 'typeorm';
import { UserService } from 'src/users/providers/user.services';
import { CreateTweetDto } from './dto/create-tweet.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { UpdateTweetDto } from './dto/update-tweet.dto';

@Injectable()
export class TweetService {
  private readonly logger = new Logger(TweetService.name);

  constructor(
    @InjectRepository(Tweet)
    private tweetRepository: Repository<Tweet>,

    private readonly userService: UserService,
  ) {}

  async getAllTweet(userId: number) {
    const user = await this.userService.findOneById(userId);

    if (!user) {
      throw new NotFoundException(`User with ${userId} not found`);
    }

    this.logger.debug(
      JSON.stringify({ msg: 'tweet.getAllTweet', userId: user.id }),
    );

    return await this.tweetRepository.find({
      where: { user: { id: userId } },
    });
  }

  public async createTweet(createTweetDto: CreateTweetDto) {
    const User = await this.userService.findOneById(createTweetDto.userId);

    const tweet = await this.tweetRepository.create({
      ...createTweetDto,
      user: User,
    });
    return this.tweetRepository.save(tweet);
  }

  public async updateTweet(updateTweetDto: UpdateTweetDto) {
    const tweet = await this.tweetRepository.findOneBy({
      id: updateTweetDto.id,
    });

    if (!tweet) {
      throw new NotFoundException(
        `Tweet with id ${updateTweetDto.id} not found`,
      );
    }

    tweet.text = updateTweetDto.text || tweet.text;
    tweet.image = updateTweetDto.image || tweet.image;

    return this.tweetRepository.save(tweet);
  }

  public async DeleteTweet(id: number) {
    await this.tweetRepository.delete({
      id,
    });

    return { deleted: true, id };
  }
}
