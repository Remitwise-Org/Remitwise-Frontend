/**
 * IPFS client interfaces for the Storage service.
 * These types model the operations and results from ipfs-http-client.
 */

/** Result of adding content to IPFS */
export interface IpfsAddResult {
  /** IPFS Content Identifier (CID) as a string */
  cid: string;
  /** Size of the added content in bytes */
  size: number;
}

/** Pin status for a CID */
export interface PinStatus {
  /** The CID that was pinned or unpinned */
  cid: string;
  /** Current pin status */
  pinned: boolean;
}

/** Content retrieved from IPFS */
export interface IpfsContentResult {
  /** The CID of the retrieved content */
  cid: string;
  /** The content as a Buffer */
  content: Buffer;
  /** Size of the content in bytes */
  size: number;
}

/** Document type enum matching the on-chain ipfs-metadata contract */
export enum DocumentType {
  DEED = 'Deed',
  TITLE = 'Title',
  INSPECTION = 'Inspection',
  APPRAISAL = 'Appraisal',
  SURVEY = 'Survey',
  TAX_RECORDS = 'TaxRecords',
  INSURANCE = 'Insurance',
  IMAGES = 'Images',
  FLOOR_PLANS = 'FloorPlans',
  LEGAL = 'Legal',
  OTHER = 'Other',
}

/** Access levels matching the on-chain contract */
export enum AccessLevel {
  NONE = 'None',
  READ = 'Read',
  WRITE = 'Write',
  ADMIN = 'Admin',
}

/** IPFS CID validation result */
export interface CidValidationResult {
  valid: boolean;
  version?: 'v0' | 'v1';
  error?: string;
}
