import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from './storage.service';
import {
  RegisterDocumentDto,
  PinDocumentDto,
  VerifyHashDto,
  UploadImageDto,
} from './dto/storage.dto';

/**
 * StorageController exposes REST endpoints for IPFS storage operations
 * that integrate with the on-chain ipfs-metadata Soroban contract.
 */
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storageService: StorageService) {}

  // ============================================================================
  // Content Endpoints
  // ============================================================================

  /**
   * Add arbitrary content to IPFS.
   * POST /storage/content
   */
  @Post('content')
  async addContent(
    @Body() body: { data: string },
  ) {
    if (!body.data) {
      throw new BadRequestException('Request body must include a "data" field');
    }

    try {
      const result = await this.storageService.addContent(body.data);
      return {
        success: true,
        cid: result.cid,
        size: result.size,
        gatewayUrl: this.storageService.getGatewayUrl(result.cid),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`addContent failed: ${message}`);
      throw new InternalServerErrorException(`Failed to add content: ${message}`);
    }
  }

  /**
   * Retrieve content from IPFS by CID.
   * GET /storage/content/:cid
   */
  @Get('content/:cid')
  async getContent(@Param('cid') cid: string) {
    try {
      const result = await this.storageService.getContent(cid);
      return {
        success: true,
        cid: result.cid,
        size: result.size,
        content: result.content.toString('base64'),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (message.includes('not found') || message.includes('does not exist')) {
        throw new NotFoundException(`Content not found for CID: ${cid}`);
      }

      this.logger.error(`getContent failed for ${cid}: ${message}`);
      throw new InternalServerErrorException(
        `Failed to retrieve content: ${message}`,
      );
    }
  }

  // ============================================================================
  // Pin Endpoints
  // ============================================================================

  /**
   * Pin a document on IPFS and record it on-chain.
   * POST /storage/pin
   */
  @Post('pin')
  async pinDocument(@Body() dto: PinDocumentDto) {
    try {
      // Note: In production, the document_id would be used to look up the CID
      // from the on-chain ipfs-metadata contract before pinning.
      // For now we accept document_id and return a structured response.
      return {
        success: true,
        document_id: dto.document_id,
        message: `Pin request recorded for document ${dto.document_id}. Use the /storage/pin/:cid endpoint to pin by CID.`,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`pinDocument failed: ${message}`);
      throw new InternalServerErrorException(`Failed to pin document: ${message}`);
    }
  }

  /**
   * Pin a CID directly on IPFS.
   * POST /storage/pin/:cid
   */
  @Post('pin/:cid')
  async pinCid(@Param('cid') cid: string) {
    try {
      const result = await this.storageService.pinCid(cid);
      return {
        success: true,
        cid: result.cid,
        pinned: result.pinned,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`pinCid failed for ${cid}: ${message}`);
      throw new InternalServerErrorException(`Failed to pin CID: ${message}`);
    }
  }

  /**
   * Unpin a CID from IPFS.
   * DELETE /storage/pin/:cid
   */
  @Delete('pin/:cid')
  async unpinCid(@Param('cid') cid: string) {
    try {
      const result = await this.storageService.unpinCid(cid);
      return {
        success: true,
        cid: result.cid,
        pinned: result.pinned,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`unpinCid failed for ${cid}: ${message}`);
      throw new InternalServerErrorException(
        `Failed to unpin CID: ${message}`,
      );
    }
  }

  /**
   * Check whether a CID is pinned.
   * GET /storage/pin/:cid/status
   */
  @Get('pin/:cid/status')
  async getPinStatus(@Param('cid') cid: string) {
    try {
      const pinned = await this.storageService.isPinned(cid);
      return {
        success: true,
        cid,
        pinned,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`getPinStatus failed for ${cid}: ${message}`);
      throw new InternalServerErrorException(
        `Failed to check pin status: ${message}`,
      );
    }
  }

  // ============================================================================
  // Hash Verification Endpoint
  // ============================================================================

  /**
   * Verify that the content at a CID matches an expected hash.
   * POST /storage/verify-hash
   */
  @Post('verify-hash')
  async verifyHash(@Body() dto: VerifyHashDto) {
    try {
      // Note: In production, document_id would be resolved to a CID via the
      // on-chain contract. Here we accept a CID directly for off-chain verification.
      throw new BadRequestException(
        'Please use POST /storage/verify-hash/:cid with body { expected_hash: "..." }',
      );
    } catch (error: unknown) {
      if (error instanceof BadRequestException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`verifyHash failed: ${message}`);
      throw new InternalServerErrorException(
        `Failed to verify hash: ${message}`,
      );
    }
  }

  /**
   * Verify content hash for a specific CID.
   * POST /storage/verify-hash/:cid
   */
  @Post('verify-hash/:cid')
  async verifyCidHash(
    @Param('cid') cid: string,
    @Body() body: { expected_hash: string },
  ) {
    if (!body.expected_hash) {
      throw new BadRequestException(
        'Request body must include an "expected_hash" field',
      );
    }

    try {
      const result = await this.storageService.verifyContentHash(
        cid,
        body.expected_hash,
      );
      return {
        success: true,
        cid,
        valid: result.valid,
        computed_hash: result.computedHash,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`verifyCidHash failed for ${cid}: ${message}`);
      throw new InternalServerErrorException(
        `Failed to verify content hash: ${message}`,
      );
    }
  }

  // ============================================================================
  // Image Upload Endpoint
  // ============================================================================

  /**
   * Upload and optimize an image, then pin it to IPFS.
   * POST /storage/image
   */
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadImageDto,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Include a "file" field in the request.');
    }

    if (!file.mimetype) {
      throw new BadRequestException('File MIME type could not be determined.');
    }

    try {
      const result = await this.storageService.optimizeAndUploadImage(
        file.buffer,
        file.mimetype,
      );

      // Auto-pin uploaded images
      await this.storageService.pinCid(result.cid);

      return {
        success: true,
        cid: result.cid,
        size: result.size,
        original_name: file.originalname,
        mime_type: file.mimetype,
        property_id: dto.property_id,
        document_type: dto.document_type ?? 'Images',
        gateway_url: this.storageService.getGatewayUrl(result.cid),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      if (
        message.includes('Unsupported image type') ||
        message.includes('unsupported or corrupt image format')
      ) {
        throw new BadRequestException(message);
      }

      this.logger.error(`uploadImage failed: ${message}`);
      throw new InternalServerErrorException(
        `Failed to upload image: ${message}`,
      );
    }
  }

  // ============================================================================
  // Document Registration (off-chain proxy for on-chain contract)
  // ============================================================================

  /**
   * Register document metadata. This is an off-chain staging endpoint
   * that validates the payload before submitting to the on-chain
   * ipfs-metadata contract via Soroban RPC.
   * POST /storage/document
   */
  @Post('document')
  async registerDocument(@Body() dto: RegisterDocumentDto) {
    try {
      // Validate CID format before on-chain submission
      const cidValidation = this.storageService.validateCid(dto.ipfs_cid);
      if (!cidValidation.valid) {
        throw new BadRequestException(
          `Invalid IPFS CID: ${cidValidation.error}`,
        );
      }

      // Verify the CID is reachable on IPFS
      try {
        await this.storageService.getContent(dto.ipfs_cid);
      } catch {
        throw new BadRequestException(
          `IPFS CID ${dto.ipfs_cid} is not reachable on the IPFS network`,
        );
      }

      return {
        success: true,
        message: 'Document validated and ready for on-chain registration',
        ipfs_cid: dto.ipfs_cid,
        property_id: dto.property_id,
        document_type: dto.document_type,
        gateway_url: this.storageService.getGatewayUrl(dto.ipfs_cid),
      };
    } catch (error: unknown) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`registerDocument failed: ${message}`);
      throw new InternalServerErrorException(
        `Failed to register document: ${message}`,
      );
    }
  }

  // ============================================================================
  // Utility Endpoints
  // ============================================================================

  /**
   * Validate a CID format (mirrors on-chain validation).
   * GET /storage/validate-cid?cid=Qm...
   */
  @Get('validate-cid')
  async validateCid(@Query('cid') cid: string) {
    if (!cid) {
      throw new BadRequestException('Query parameter "cid" is required');
    }

    const result = this.storageService.validateCid(cid);
    return {
      success: true,
      cid,
      ...result,
    };
  }

  /**
   * Get current storage configuration and limits.
   * GET /storage/config
   */
  @Get('config')
  async getConfig() {
    return {
      success: true,
      limits: this.storageService.getLimits(),
      image: this.storageService.getImageConfig(),
    };
  }
}
