import { Global, Inject, Injectable, Module, OnModuleDestroy, Optional, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './rate-limit.constants';
import { RateLimitService } from './rate-limit.service';

const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  inject: [ConfigService],
  useFactory: (config: ConfigService): Redis | null => {
    const url = config.get<string>('REDIS_URL')?.trim();
    if (!url) {
      return null;
    }
    return new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
  },
};

@Injectable()
class RedisClientShutdown implements OnModuleDestroy {
  constructor(@Optional() @Inject(REDIS_CLIENT) private readonly redis: Redis | null) {}

  async onModuleDestroy(): Promise<void> {
    if (!this.redis) {
      return;
    }
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}

@Global()
@Module({
  providers: [redisProvider, RateLimitService, RedisClientShutdown],
  exports: [RateLimitService, REDIS_CLIENT],
})
export class RateLimitModule {}
