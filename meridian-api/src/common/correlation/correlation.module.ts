import { Global, Module } from '@nestjs/common';
import { CorrelationIdStore } from './correlation-id.store';
import { CorrelationIdProvider } from './correlation-id.provider';
import { CorrelationIdInterceptor } from './correlation-id.interceptor';

@Global()
@Module({
  providers: [
    CorrelationIdStore,
    CorrelationIdProvider,
    CorrelationIdInterceptor,
  ],
  exports: [
    CorrelationIdStore,
    CorrelationIdProvider,
    CorrelationIdInterceptor,
  ],
})
export class CorrelationModule {}
