import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardProofService } from './leaderboard-proof.service';
import { LeaderboardController } from './leaderboard-proof.controller';
import { LeaderboardEpoch } from './leaderboard-epoch.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { CorrelationModule } from '../common/correlation/correlation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LeaderboardEpoch, AuditLog]),
    CorrelationModule,
  ],
  providers: [LeaderboardProofService],
  controllers: [LeaderboardController],
  exports: [LeaderboardProofService],
})
export class LeaderboardProofModule {}
