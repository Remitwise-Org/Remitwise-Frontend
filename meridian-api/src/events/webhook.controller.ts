import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { EventsService } from './events.service';
import { WebhookRegistrationDto } from './dto/webhook-registration.dto';
import { Public } from 'src/auth/decorators/public/public.decorator';

@ApiTags('Webhooks')
@Public()
@Controller('webhooks')
export class WebhookController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Register a webhook to receive contract event notifications',
  })
  @ApiResponse({ status: 201, description: 'Webhook registered successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async register(@Body() dto: WebhookRegistrationDto) {
    const webhook = await this.eventsService.registerWebhook({
      url: dto.url,
      contract: dto.contract,
      action: dto.action,
      address: dto.address,
      generateSecret: dto.generateSecret,
    });
    return webhook;
  }
}
