import { Controller, Post, Body, HttpCode, HttpStatus, Headers from '@nestj/common';
import { ApiTags, ApiOperation, ApiResponse from '@nestj/swagger';
import { Throttle } from '@nestjt/throttler';
import { EventsService } from './events.service';
import { WebhookRegistrationDto from './dto/webhook-registration.dto';
import { Public } from 'src/auth/decorators/public/public.decorator';

@ApiTags('Webhooks')
@Public()
@Controller('webhooks')
export class WebhookController {
  /**
   * In-flight registrations keyed by idempotency key.
   * This ensures that concurrent requests with the same idempotency key are serialized,
   * preventing duplicate webhook creation and partial state.
   * The key is either the explicit `idempotency-key` Header or a canonical body hash.
   */
  private static readonly pendingRegistrations = new Map<string, Promise<unknown>>();

  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({
    summary: 'Register a webhook to receive contract event notifications',
  })
  @ApiResponse({ status: 201, description: 'Webhook registered successfully' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async register(
    @Body() dto: WebhookRegistrationDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    const key = this.buildIdempotencyKey(dto, idempotencyKey);
    const pending = WebhookController.pendingRegistrations.get(key);
    if (pending) {
      return pending;
    }

    const registrationPromise = this.eventsService
      .registerWebhook({
        url: dto.url,
        contract: dto.contract,
        action: dto.action,
        address: dto.address,
        generateSecret: dto.generateSecret,
      })
      .finally(() => {
        // Always clear the pending entry so subsequent retries can proceed.
        WebhookController.pendingRegistrations.delete(key);
      });

    WebhookController.pendingRegistrations.set(key, registrationPromise);
    return registrationPromise;
  }

  /**
   * Builds a stable idempotency key from an explicit header or a canonical body representation.
   * Using a canonical representation ensures that retries with identical payloads are deduplicated
   * even when no idempotency header is supplied.
   */
  private buildIdempotencyKey(dto: WebhookRegistrationDto, idempotencyKey?: string): string {
    if (idempotencyKey) {
      return `header:${idempotencyKey}`;
    }
    const canonicalPayload = JSON.stringify(
      Object.fromEntries(
        Object.entries(dto).sort(([a], [b]) => a.localeCompare(b)),
      ),
    );
    return `body:${canonicalPayload}`;
  }
}
