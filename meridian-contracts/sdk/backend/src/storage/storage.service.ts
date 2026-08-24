import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { create as createIpfsClient, IPFSHTTPClient } from 'ipfs-http-client';
import sharp from 'sharp';
import { create as createMultihash } from 'multiformats/hashes/digest';
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string';
import {
  IpfsAddResult,
  IpfsContentResult,
  PinStatus,
  CidValidationResult,
} from './interfaces/ipfs.interface';
import {
  StorageConfig,
  IpfsConfig,
  ipfsConfigKey,
} from '../config/configuration';

/**
 * StorageService provides IPFS-based decentralized storage functionality
 * integrated with the on-chain ipfs-metadata Soroban contract.
 *
 * Responsibilities:
 *  - Add/pin/unpin content on IPFS
 *  - Verify IPFS content hashes (CID verification)
 *  - Optimize and upload property images
 *  - Retrieve content from IPFS
 *  - Validate CID formats matching on-chain contract rules
 */
@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(StorageService.name);
  private ipfsClient: IPFSHTTPClient | null = null;
  private readonly config: StorageConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = this.configService.get<StorageConfig>(ipfsConfigKey)!;
  }

  // ============================================================================
  // Lifecycle
  // ============================================================================

  async onModuleInit(): Promise<void> {
    await this.initializeIpfsClient();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.ipfsClient) {
      // ipfs-http-client does not expose an explicit close; release reference
      this.ipfsClient = null;
      this.logger.log('IPFS client connection closed');
    }
  }

  // ============================================================================
  // IPFS Client Initialization
  // ============================================================================

  private async initializeIpfsClient(): Promise<void> {
    const ipfsCfg = this.config.ipfs;

    try {
      const clientOptions: Record<string, unknown> = {
        url: `${ipfsCfg.protocol}://${ipfsCfg.host}:${ipfsCfg.port}`,
      };

      // Add authentication headers if credentials are configured
      if (ipfsCfg.projectId && ipfsCfg.projectSecret) {
        const auth =
          'Basic ' +
          Buffer.from(`${ipfsCfg.projectId}:${ipfsCfg.projectSecret}`).toString(
            'base64',
          );
        clientOptions.headers = { authorization: auth };
      }

      this.ipfsClient = createIpfsClient(clientOptions);

      // Verify connectivity by fetching node ID
      const nodeId = await this.ipfsClient.id();
      this.logger.log(
        `IPFS client connected — node ID: ${nodeId.id?.toString?.() ?? 'unknown'}`,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to connect to IPFS node at ${ipfsCfg.host}:${ipfsCfg.port}: ${message}`,
      );
      // Do not throw — allow the service to start; operations will fail gracefully
      this.ipfsClient = null;
    }
  }

  // ============================================================================
  // Content Operations
  // ============================================================================

  /**
   * Add arbitrary content (Buffer or string) to IPFS and return the CID.
   */
  async addContent(data: Buffer | string): Promise<IpfsAddResult> {
    this.ensureClient();

    try {
      const content =
        typeof data === 'string' ? uint8ArrayFromString(data) : data;

      const result = await this.ipfsClient!.add(content, {
        pin: false, // explicit pin is a separate operation
      });

      const cidStr = result.cid.toString();

      this.logger.verbose(`Content added to IPFS — CID: ${cidStr}`);

      return {
        cid: cidStr,
        size: Number(result.size),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to add content to IPFS: ${message}`);
      throw new Error(`IPFS add operation failed: ${message}`);
    }
  }

  /**
   * Retrieve content from IPFS by CID.
   */
  async getContent(cid: string): Promise<IpfsContentResult> {
    this.ensureClient();
    this.validateCidOrThrow(cid);

    try {
      const chunks: Uint8Array[] = [];

      for await (const chunk of this.ipfsClient!.cat(cid)) {
        chunks.push(chunk as Uint8Array);
      }

      const content = Buffer.concat(chunks);

      this.logger.verbose(
        `Content retrieved from IPFS — CID: ${cid}, size: ${content.length}`,
      );

      return {
        cid,
        content,
        size: content.length,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to get content from IPFS (${cid}): ${message}`);
      throw new Error(`IPFS cat operation failed: ${message}`);
    }
  }

  // ============================================================================
  // Pin Operations
  // ============================================================================

  /**
   * Pin a CID on the IPFS node so it is not garbage-collected.
   */
  async pinCid(cid: string): Promise<PinStatus> {
    this.ensureClient();
    this.validateCidOrThrow(cid);

    try {
      await this.ipfsClient!.pin.add(cid);

      this.logger.log(`CID pinned on IPFS: ${cid}`);

      return { cid, pinned: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      // ipfs-http-client may throw on already-pinned CIDs — treat as success
      if (message.includes('already pinned')) {
        this.logger.verbose(`CID already pinned: ${cid}`);
        return { cid, pinned: true };
      }

      this.logger.error(`Failed to pin CID ${cid}: ${message}`);
      throw new Error(`IPFS pin operation failed: ${message}`);
    }
  }

  /**
   * Unpin a CID from the IPFS node.
   */
  async unpinCid(cid: string): Promise<PinStatus> {
    this.ensureClient();
    this.validateCidOrThrow(cid);

    try {
      await this.ipfsClient!.pin.rm(cid);

      this.logger.log(`CID unpinned from IPFS: ${cid}`);

      return { cid, pinned: false };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('not pinned')) {
        this.logger.verbose(`CID was not pinned: ${cid}`);
        return { cid, pinned: false };
      }

      this.logger.error(`Failed to unpin CID ${cid}: ${message}`);
      throw new Error(`IPFS unpin operation failed: ${message}`);
    }
  }

  /**
   * Check whether a CID is currently pinned on the IPFS node.
   */
  async isPinned(cid: string): Promise<boolean> {
    this.ensureClient();
    this.validateCidOrThrow(cid);

    try {
      for await (const pinnedCid of this.ipfsClient!.pin.ls({
        paths: cid,
      })) {
        if (pinnedCid.cid.toString() === cid) {
          return true;
        }
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to check pin status for ${cid}: ${message}`);
      throw new Error(`IPFS pin status check failed: ${message}`);
    }
  }

  // ============================================================================
  // Hash Verification
  // ============================================================================

  /**
   * Verify that the content at a given CID matches an expected content hash.
   * Fetches the content and computes its SHA-256 digest, then compares
   * against the provided hex-encoded hash.
   */
  async verifyContentHash(
    cid: string,
    expectedHash: string,
  ): Promise<{ valid: boolean; computedHash: string }> {
    this.ensureClient();
    this.validateCidOrThrow(cid);

    try {
      const { content } = await this.getContent(cid);
      const computedHash = this.computeSha256Hex(content);

      const valid = computedHash === expectedHash.toLowerCase();

      if (valid) {
        this.logger.log(`Content hash verified for CID: ${cid}`);
      } else {
        this.logger.warn(
          `Content hash mismatch for CID ${cid} — expected ${expectedHash}, got ${computedHash}`,
        );
      }

      return { valid, computedHash };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to verify content hash for CID ${cid}: ${message}`,
      );
      throw new Error(`IPFS content hash verification failed: ${message}`);
    }
  }

  /**
   * Validate a CID format (mirrors on-chain validation in ipfs-metadata contract).
   *  - CIDv0: starts with "Qm" and is exactly 46 characters
   *  - CIDv1: starts with "b" and is at least 10 characters
   */
  validateCid(cid: string): CidValidationResult {
    if (!cid || cid.length === 0) {
      return { valid: false, error: 'CID cannot be empty' };
    }

    if (cid.startsWith('Qm')) {
      if (cid.length === 46) {
        return { valid: true, version: 'v0' };
      }
      return {
        valid: false,
        version: 'v0',
        error: `CIDv0 must be exactly 46 characters, got ${cid.length}`,
      };
    }

    if (cid.startsWith('b')) {
      if (cid.length >= 10) {
        return { valid: true, version: 'v1' };
      }
      return {
        valid: false,
        version: 'v1',
        error: `CIDv1 must be at least 10 characters, got ${cid.length}`,
      };
    }

    return {
      valid: false,
      error: 'CID must start with "Qm" (v0) or "b" (v1)',
    };
  }

  // ============================================================================
  // Image Optimization
  // ============================================================================

  /**
   * Optimize an image buffer by resizing and compressing, then upload to IPFS.
   * Returns the IPFS CID and optimized file size.
   */
  async optimizeAndUploadImage(
    imageBuffer: Buffer,
    mimeType: string,
  ): Promise<IpfsAddResult> {
    // Validate MIME type
    if (!this.config.image.allowedTypes.includes(mimeType)) {
      throw new Error(
        `Unsupported image type: ${mimeType}. Allowed types: ${this.config.image.allowedTypes.join(', ')}`,
      );
    }

    try {
      const { maxWidth, maxHeight, quality } = this.config.image;

      // Resize and convert based on MIME type
      let pipeline = sharp(imageBuffer).resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });

      if (mimeType === 'image/jpeg') {
        pipeline = pipeline.jpeg({ quality });
      } else if (mimeType === 'image/png') {
        pipeline = pipeline.png({ quality });
      } else if (mimeType === 'image/webp') {
        pipeline = pipeline.webp({ quality });
      }

      const optimized = await pipeline.toBuffer();

      this.logger.verbose(
        `Image optimized — original: ${imageBuffer.length} bytes, optimized: ${optimized.length} bytes`,
      );

      return this.addContent(optimized);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Image optimization failed: ${message}`);

      if (message.includes('unsupported image format') || message.includes('Input buffer contains unsupported image format')) {
        throw new Error(
          `Image optimization failed: unsupported or corrupt image format — ${message}`,
        );
      }
      throw new Error(`Image optimization failed: ${message}`);
    }
  }

  // ============================================================================
  // Gateway URL Helper
  // ============================================================================

  /**
   * Build a publicly-accessible gateway URL for a CID.
   */
  getGatewayUrl(cid: string): string {
    return `${this.config.ipfs.gatewayUrl}/ipfs/${cid}`;
  }

  // ============================================================================
  // Configuration Accessors
  // ============================================================================

  /** Return current storage limits (matching on-chain contract values). */
  getLimits() {
    return { ...this.config.limits };
  }

  /** Return current image optimization settings. */
  getImageConfig() {
    return { ...this.config.image };
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private ensureClient(): void {
    if (!this.ipfsClient) {
      throw new Error(
        'IPFS client is not connected. Check IPFS_HOST configuration and ensure the IPFS node is running.',
      );
    }
  }

  private validateCidOrThrow(cid: string): void {
    const result = this.validateCid(cid);
    if (!result.valid) {
      throw new Error(`Invalid IPFS CID "${cid}": ${result.error}`);
    }
  }

  /** Compute SHA-256 hex digest of a buffer. */
  private computeSha256Hex(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}
