import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardController } from './leaderboard-proof.controller';
import { LeaderboardProofService } from './leaderboard-proof.service';

describe('LeaderboardProofController', () => {
  let controller: LeaderboardProofController;
  let service: LeaderboardProofService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [LeaderboardProofController],
      providers: [
        {
          provide: LeaderboardProofService,
          useValue: {
            getProof: jest.fn().mockResolvedValue({
              address: 'GABC',
              epoch: 1,
              root: 'root',
              totalXp: 10,
              entries: [],
            }),
            getRankings: jest.fn().mockResolvedValue([]),
          },
        },
      ],
    }).compile();

    controller = module.get(LeaderboardProofController);
    service = module.get(LeaderboardProofService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return proof for valid address and epoch', async () => {
    const result = await controller.getProof({ address: 'GABC', epoch: 1 } as any);
    expect(service.getProof).toHaveBeenCalledWith('GABC', 1);
    expect(result.address).toBe('GABC');
  });
});
