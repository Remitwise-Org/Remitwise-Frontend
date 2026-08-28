import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { AuditLog } from '../audit/audit-log.entity';
import { EventsService, RpcProvider, ContractEvent } from './events.service';
import { Webhook } from './webhook.entity';
import { LeaderboardProofService } from '../leaderboard/leaderboard-proof.service';
import { CryptoProvider } from '../crypto/providers/crypto.provider';

describe('EventsService', () => {
  let service: EventsService;
  let mockAuditService: Partial<AuditService>;
  let mockWebhookRepo: Partial<Repository<Webhook>>;
  let mockRpcProvider: RpcProvider;
  let mockLeaderboardService: Partial<LeaderboardProofService>;

  beforeEach(async () => {
    const mockAuditLogRepo = {
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockResolvedValue({ id: 1 }),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(null),
      count: jest.fn().mockResolvedValue(0),
    };

    mockAuditService = new AuditService(
      mockAuditLogRepo as unknown as Repository<AuditLog>,
      { get: () => 'test-correlation' } as any,
    );
    jest.spyOn(mockAuditService, 'logContractEvent').mockResolvedValue({
      id: 1,
      txHash: '0xtx1',
      contract: 'escrow',
      contractAction: 'created',
      blockNumber: 100,
      chainHash: 'abc123',
      previousHash: null,
      rawEvent: {},
      createdAt: new Date(),
      entityName: 'escrow',
      entityId: null,
      action: 'CONTRACT_EVENT' as any,
      performedById: null,
      performedByEmail: null,
      previousValues: null,
      newValues: null,
      ipAddress: null,
      participantAddress: null,
      contributionXp: 0,
      epochNumber: null,
      correlationId: 'test-correlation',
    } as AuditLog);

    mockWebhookRepo = {
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockReturnValue({}),
      save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    mockLeaderboardService = {
      extractContribution: jest.fn().mockReturnValue({ address: null, xp: 0 }),
      getEpochNumberFromBlock: jest.fn().mockReturnValue(1),
    };

    const mockCryptoProvider = {
      isEnabled: jest.fn().mockReturnValue(true),
      encrypt: jest.fn().mockResolvedValue({ ciphertext: 'envelope', dekId: 'dek-1' }),
      decrypt: jest.fn().mockResolvedValue('the-plain-secret'),
      createDek: jest.fn(),
      attachDekToUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: AuditService, useValue: mockAuditService },
        { provide: getRepositoryToken(Webhook), useValue: mockWebhookRepo },
        { provide: LeaderboardProofService, useValue: mockLeaderboardService },
        { provide: CryptoProvider, useValue: mockCryptoProvider },
        {
          provide: require('../common/correlation/correlation-id.store')
            .CorrelationIdStore,
          useValue: { get: () => 'test-correlation', run: (_id: string, fn: () => unknown) => fn() },
        },
      ],
    }).compile();

    service = module.get<EventsService>(EventsService);
    service.stopPolling();

    const events: ContractEvent[] = [
      {
        txHash: '0xtx1',
        contract: 'escrow',
        action: 'created',
        blockNumber: 100,
        data: { amount: '1000' },
        address: 'GABC…',
      },
      {
        txHash: '0xtx2',
        contract: 'governance',
        action: 'proposed',
        blockNumber: 101,
        data: { proposalId: '42' },
      },
    ];

    mockRpcProvider = {
      getLatestBlockNumber: jest.fn().mockResolvedValue(101),
      getEvents: jest.fn().mockResolvedValue(events),
    };
    service.setProvider(mockRpcProvider);
  });

  describe('pollContractEvents', () => {
    it('should poll and ingest contract events', async () => {
      await service.pollContractEvents();

      expect(mockRpcProvider.getLatestBlockNumber).toHaveBeenCalled();
      expect(mockRpcProvider.getEvents).toHaveBeenCalledWith(1, 101);
      expect(mockAuditService.logContractEvent).toHaveBeenCalledTimes(2);
    });

    it('should not re-process already polled blocks', async () => {
      await service.pollContractEvents();
      (mockAuditService.logContractEvent as jest.Mock).mockClear();

      await service.pollContractEvents();
      expect(mockAuditService.logContractEvent).not.toHaveBeenCalled();
    });

    it('should handle RPC provider errors gracefully', async () => {
      mockRpcProvider.getLatestBlockNumber = jest
        .fn()
        .mockRejectedValue(new Error('RPC timeout'));

      await expect(service.pollContractEvents()).resolves.not.toThrow();
    });
  });

  describe('findAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      const mockFind = jest
        .spyOn(mockAuditService['auditRepo'], 'find')
        .mockResolvedValue([{ id: 1 } as AuditLog]);
      jest.spyOn(mockAuditService['auditRepo'], 'count').mockResolvedValue(1);

      const result = await service.findAuditLogs({ limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findByTxHash', () => {
    it('should find audit log by tx hash', async () => {
      jest
        .spyOn(mockAuditService['auditRepo'], 'findOne')
        .mockResolvedValue({ txHash: '0xtx1' } as AuditLog);

      const result = await service.findByTxHash('0xtx1');
      expect(result).not.toBeNull();
      expect(result!.txHash).toBe('0xtx1');
    });

    it('should return null for unknown tx hash', async () => {
      const result = await service.findByTxHash('0xunknown');
      expect(result).toBeNull();
    });
  });

  describe('verifyHashChain', () => {
    it('should return valid for empty chain', async () => {
      jest.spyOn(mockAuditService['auditRepo'], 'find').mockResolvedValue([]);

      const result = await service.verifyHashChain();
      expect(result.valid).toBe(true);
      expect(result.entries).toBe(0);
    });

    it('should detect tampering in a historical audit entry', async () => {
      const tamperedEntries = [
        {
          id: 1,
          txHash: '0xtx1',
          contract: 'escrow',
          contractAction: 'created',
          blockNumber: 100,
          rawEvent: {},
          previousHash: null,
          chainHash: 'tampered-hash',
        },
        {
          id: 2,
          txHash: '0xtx2',
          contract: 'governance',
          contractAction: 'proposed',
          blockNumber: 101,
          rawEvent: {},
          previousHash: 'tampered-hash',
          chainHash: 'hash-2',
        },
      ] as AuditLog[];

      jest.spyOn(mockAuditService['auditRepo'], 'find').mockResolvedValue(tamperedEntries);

      const result = await service.verifyHashChain();
      expect(result.valid).toBe(false);
      expect(result.tamperedAt).toBe(1);
    });
  });

  describe('buildMerkleProof', () => {
    it('should produce a verifiable merkle proof for a leaderboard entry', async () => {
      const entries = [
        { id: 1, chainHash: 'leaf-1' },
        { id: 2, chainHash: 'leaf-2' },
        { id: 3, chainHash: 'leaf-3' },
      ] as AuditLog[];

      const proof = await service.buildMerkleProof(2, entries);

      expect(proof).toBeDefined();
      expect(proof?.verified).toBe(true);
      expect(service.verifyMerkleProof(proof!.leaf, proof!.proof, proof!.root)).toBe(true);
    });

    it('should reject forged merkle proofs', () => {
      expect(service.verifyMerkleProof('forged-leaf', ['fake-proof'], 'root')).toBe(false);
    });
  });

  describe('registerWebhook', () => {
    it('should register a webhook with generated secret', async () => {
      const result = await service.registerWebhook({
        url: 'https://example.com/webhook',
        contract: 'escrow',
        action: 'created',
      });

      expect(mockWebhookRepo.create).toHaveBeenCalled();
      expect(mockWebhookRepo.save).toHaveBeenCalled();
    });

    it('encrypts the secret at rest and returns the plaintext once (issue #631)', async () => {
      mockWebhookRepo.create.mockImplementation((entity) => entity);
      mockWebhookRepo.save.mockImplementation((entity) =>
        Promise.resolve({ id: 'wh-1', ...entity }),
      );

      const result = await service.registerWebhook({
        url: 'https://example.com/webhook',
      });

      expect(mockWebhookRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          secret: null,
          encryptedData: 'envelope',
          dataEncryptionKeyId: 'dek-1',
        }),
      );
      expect(result.secret).toMatch(/^[0-9a-f]{64}$/);
      expect(result.encryptedData).toBeNull();
      expect(result.dataEncryptionKeyId).toBeNull();
    });
  });
});
