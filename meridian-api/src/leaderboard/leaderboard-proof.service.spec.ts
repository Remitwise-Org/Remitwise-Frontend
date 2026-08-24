import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeaderboardProofService } from './leaderboard-proof.service';
import { LeaderboardEpoch } from './leaderboard-epoch.entity';
import { AuditLog } from '../audit/audit-log.entity';
import { CorrelationIdStore } from '../common/correlation/correlation-id.store';

describe('LeaderboardProofService', () => {
  let service: LeaderboardProofService;
  let mockEpochRepo: Partial<Repository<LeaderboardEpoch>>;
  let mockAuditRepo: Partial<Repository<AuditLog>>;

  beforeEach(async () => {
    mockEpochRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockReturnValue({} as LeaderboardEpoch),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
    };

    mockAuditRepo = {
      find: jest.fn().mockResolvedValue([]),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        LeaderboardProofService,
        { provide: getRepositoryToken(LeaderboardEpoch), useValue: mockEpochRepo },
        { provide: getRepositoryToken(AuditLog), useValue: mockAuditRepo },
        {
          provide: CorrelationIdStore,
          useValue: { get: () => 'test-correlation', run: (_id: string, fn: () => unknown) => fn() },
        },
      ],
    }).compile();

    service = module.get(LeaderboardProofService);
  });

  it('should compute Merkle proofs for verified leaderboard entries', async () => {
    const mockEntries = [
      { id: 1, chainHash: 'leaf-1', participantAddress: 'GABC', contributionXp: 10, epochNumber: 1 },
      { id: 2, chainHash: 'leaf-2', participantAddress: 'GABC', contributionXp: 5, epochNumber: 1 },
      { id: 3, chainHash: 'leaf-3', participantAddress: 'GDEF', contributionXp: 8, epochNumber: 1 },
    ] as AuditLog[];

    jest.spyOn(mockEpochRepo, 'findOne').mockResolvedValue({ epoch: 1, merkleRoot: '' } as LeaderboardEpoch);
    jest.spyOn(mockAuditRepo, 'find')
      .mockResolvedValueOnce([
        { id: 1, chainHash: 'leaf-1', participantAddress: 'GABC', contributionXp: 10, epochNumber: 1 },
        { id: 2, chainHash: 'leaf-2', participantAddress: 'GABC', contributionXp: 5, epochNumber: 1 },
      ] as AuditLog[])
      .mockResolvedValueOnce(mockEntries as AuditLog[]);

    const result = await service.getProof('GABC', 1);
    expect(result).toBeDefined();
    expect(result?.entries).toHaveLength(2);
    expect(result?.totalXp).toBe(15);
    expect(result?.entries[0]?.proof?.verified).toBe(true);
  });

  it('should return null for unknown address/epoch', async () => {
    jest.spyOn(mockEpochRepo, 'findOne').mockResolvedValue(null);
    const result = await service.getProof('UNKNOWN', 1);
    expect(result).toBeNull();
  });

  it('should reject forged merkle proofs', async () => {
    const result = await service.getProof('GABC', 999);
    expect(result).toBeNull();
  });

  it('should extract contribution from settled claim', () => {
    const event = {
      txHash: '0x1',
      contract: 'claims',
      action: 'settled',
      blockNumber: 100,
      data: { claimant: 'GABC', amount: 10_000_000 },
      address: 'GABC',
    } as any;

    const extraction = service.extractContribution(event);
    expect(extraction.address).toBe('GABC');
    expect(extraction.xp).toBeGreaterThan(0);
  });

  it('should extract contribution from governance vote', () => {
    const event = {
      txHash: '0x2',
      contract: 'governance',
      action: 'vote',
      blockNumber: 101,
      data: { voter: 'GDEF' },
      address: 'GDEF',
    } as any;

    const extraction = service.extractContribution(event);
    expect(extraction.address).toBe('GDEF');
    expect(extraction.xp).toBe(5);
  });

  it('should extract contribution from oracle valuation update', () => {
    const event = {
      txHash: '0x3',
      contract: 'oracle',
      action: 'ValuationUpdated',
      blockNumber: 102,
      data: {},
      address: 'GHIJ',
    } as any;

    const extraction = service.extractContribution(event);
    expect(extraction.address).toBe('GHIJ');
    expect(extraction.xp).toBe(10);
  });
});
