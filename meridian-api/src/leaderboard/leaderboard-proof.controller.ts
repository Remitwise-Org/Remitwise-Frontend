import {
  Controller,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { LeaderboardProofService } from './leaderboard-proof.service';
import { LeaderboardProofQueryDto, LeaderboardRankingQueryDto } from './leaderboard-proof.dto';
import { Public } from 'src/auth/decorators/public/public.decorator';

@ApiTags('Leaderboard')
@Public()
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardProofService) {}

  @Get('proof')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Return the Merkle proof and source tx hash for a participant in an epoch',
  })
  @ApiQuery({ name: 'address', description: 'Participant wallet or on-chain address', type: String })
  @ApiQuery({ name: 'epoch', description: 'Epoch number', type: Number })
  @ApiResponse({ status: 200, description: 'Merkle proof bundle for the address' })
  @ApiResponse({ status: 404, description: 'No proof found for address/epoch' })
  async getProof(@Query() query: LeaderboardProofQueryDto) {
    const result = await this.leaderboardService.getProof(query.address, query.epoch ?? 1);
    if (!result || result.entries.length === 0) {
      throw new NotFoundException(`No proof found for address ${query.address} in epoch ${query.epoch}`);
    }
    return result;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Return the verified leaderboard rankings for an epoch',
  })
  @ApiQuery({ name: 'epoch', description: 'Epoch number (defaults to latest closed epoch)', type: Number })
  @ApiQuery({ name: 'limit', description: 'Max results', type: Number })
  @ApiResponse({ status: 200, description: 'Verified leaderboard rankings' })
  async getLeaderboard(@Query() query: LeaderboardRankingQueryDto) {
    return this.leaderboardService.getRankings(query.epoch);
  }
}
