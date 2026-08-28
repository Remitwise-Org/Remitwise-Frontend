import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './audit-log.entity';
import { AuditService } from './audit.service';
import { CorrelationModule } from '../common/correlation/correlation.module';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog]), CorrelationModule],
  providers: [AuditService],
  exports: [AuditService, TypeOrmModule],
})
export class AuditModule {}
