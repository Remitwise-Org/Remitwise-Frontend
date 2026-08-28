# Property Token Standard Documentation

## Overview

The Property Token Standard is a comprehensive implementation that maintains compatibility with both ERC-721 and ERC-1155 token standards while adding real estate-specific features and cross-chain support. This standard enables the tokenization of real estate properties with enhanced functionality for compliance, legal documentation, and interoperability across different blockchain networks.

## Key Features

### 1. Dual Standard Compatibility
- **ERC-721 Compliance**: Full compatibility with the Ethereum NFT standard
- **ERC-1155 Support**: Batch operations and multi-token management
- **Backward Compatibility**: Works with existing ERC-721 wallets and marketplaces

### 2. Real Estate-Specific Enhancements
- **Property Metadata Schema**: Extended metadata for real estate properties
- **Legal Document Attachment**: Secure attachment of legal documents
- **Ownership History Tracking**: Complete transfer history
- **Compliance Verification**: Built-in compliance checking system

### 3. Cross-Chain Support
- **Token Bridging**: Standardized cross-chain token transfer
- **Metadata Preservation**: Consistent metadata across chains
- **Ownership Verification**: Cross-chain ownership validation

## Contract Structure

### Main Contract: PropertyToken

Located at: `contracts/property-token/src/lib.rs`

#### Storage Structure

```rust
#[ink(storage)]
pub struct PropertyToken {
    // ERC-721 standard mappings
    token_owner: Mapping<TokenId, AccountId>,
    owner_token_count: Mapping<AccountId, u32>,
    token_approvals: Mapping<TokenId, AccountId>,
    operator_approvals: Mapping<(AccountId, AccountId), bool>,
    
    // ERC-1155 batch operation support
    balances: Mapping<(AccountId, TokenId), u128>,
    operators: Mapping<(AccountId, AccountId), bool>,
    
    // Property-specific mappings
    token_properties: Mapping<TokenId, PropertyInfo>,
    property_tokens: Mapping<u64, TokenId>,
    ownership_history: Mapping<TokenId, Vec<OwnershipTransfer>>,
    compliance_flags: Mapping<TokenId, ComplianceInfo>,
    legal_documents: Mapping<TokenId, Vec<DocumentInfo>>,
    
    // Cross-chain bridge mappings
    bridged_tokens: Mapping<(ChainId, TokenId), BridgedTokenInfo>,
    bridge_operators: Vec<AccountId>,
    
    // Standard counters
    total_supply: u64,
    token_counter: u64,
    admin: AccountId,
}
```

## Core Functionality

### ERC-721 Compatible Methods

#### `balance_of(owner: AccountId) -> u32`
Returns the number of tokens owned by an account.

#### `owner_of(token_id: TokenId) -> Option<AccountId>`
Returns the owner of a specific token.

#### `transfer_from(from: AccountId, to: AccountId, token_id: TokenId) -> Result<(), Error>`
Transfers a token from one account to another with proper authorization checks.

#### `approve(to: AccountId, token_id: TokenId) -> Result<(), Error>`
Approves an account to transfer a specific token.

#### `set_approval_for_all(operator: AccountId, approved: bool) -> Result<(), Error>`
Sets or unsets an operator for an owner.

#### `get_approved(token_id: TokenId) -> Option<AccountId>`
Gets the approved account for a token.

#### `is_approved_for_all(owner: AccountId, operator: AccountId) -> bool`
Checks if an operator is approved for an owner.

### ERC-1155 Compatible Methods

#### `balance_of_batch(accounts: Vec<AccountId>, ids: Vec<TokenId>) -> Vec<u128>`
Returns the balances of multiple tokens for multiple accounts.

#### `safe_batch_transfer_from(from: AccountId, to: AccountId, ids: Vec<TokenId>, amounts: Vec<u128>, data: Vec<u8>) -> Result<(), Error>`
Safely transfers multiple tokens in a single transaction.

#### `uri(token_id: TokenId) -> Option<String>`
Returns the URI for token metadata.

### Property-Specific Methods

#### `register_property_with_token(metadata: PropertyMetadata) -> Result<TokenId, Error>`
Registers a new property and mints a corresponding token.

**Parameters:**
- `metadata`: Property metadata including location, size, legal description, etc.

**Returns:**
- `Ok(token_id)`: The ID of the newly created token
- `Err(Error)`: Various error conditions

#### `attach_legal_document(token_id: TokenId, document_hash: Hash, document_type: String) -> Result<(), Error>`
Attaches a legal document to a property token.

**Parameters:**
- `token_id`: The token to attach the document to
- `document_hash`: IPFS hash or other identifier for the document
- `document_type`: Type of document (e.g., "Deed", "Title", "Survey")

#### `verify_compliance(token_id: TokenId, verification_status: bool) -> Result<(), Error>`
Verifies compliance for a property token.

**Parameters:**
- `token_id`: The token to verify
- `verification_status`: True if compliant, false otherwise

#### `get_ownership_history(token_id: TokenId) -> Option<Vec<OwnershipTransfer>>`
Retrieves the complete ownership history for a token.

### Cross-Chain Methods

#### `bridge_to_chain(destination_chain: ChainId, token_id: TokenId, recipient: AccountId) -> Result<(), Error>`
Initiates token bridging to another chain.

**Parameters:**
- `destination_chain`: Target chain ID
- `token_id`: Token to bridge
- `recipient`: Recipient address on destination chain

#### `receive_bridged_token(source_chain: ChainId, original_token_id: TokenId, recipient: AccountId) -> Result<(), Error>`
Receives a bridged token from another chain.

**Parameters:**
- `source_chain`: Source chain ID
- `original_token_id`: Original token ID on source chain
- `recipient`: Recipient address on current chain

#### `add_bridge_operator(operator: AccountId) -> Result<(), Error>`
Adds a bridge operator (admin only).

#### `remove_bridge_operator(operator: AccountId) -> Result<(), Error>`
Removes a bridge operator (admin only).

## Data Structures

### PropertyMetadata
Extended metadata structure for real estate properties:

```rust
pub struct PropertyMetadata {
    pub location: String,
    pub size: u64,
    pub legal_description: String,
    pub valuation: u128,
    pub documents_url: String,
}
```

### PropertyInfo
Complete property information:

```rust
pub struct PropertyInfo {
    pub id: u64,
    pub owner: AccountId,
    pub metadata: PropertyMetadata,
    pub registered_at: u64,
}
```

### ComplianceInfo
Compliance verification information:

```rust
pub struct ComplianceInfo {
    pub verified: bool,
    pub verification_date: u64,
    pub verifier: AccountId,
    pub compliance_type: String,
}
```

### DocumentInfo
Legal document information:

```rust
pub struct DocumentInfo {
    pub document_hash: Hash,
    pub document_type: String,
    pub upload_date: u64,
    pub uploader: AccountId,
}
```

## Events

### Standard Events

```rust
#[ink(event)]
pub struct Transfer {
    #[ink(topic)]
    pub from: Option<AccountId>,
    #[ink(topic)]
    pub to: Option<AccountId>,
    #[ink(topic)]
    pub id: TokenId,
}

#[ink(event)]
pub struct Approval {
    #[ink(topic)]
    pub owner: AccountId,
    #[ink(topic)]
    pub spender: AccountId,
    #[ink(topic)]
    pub id: TokenId,
}

#[ink(event)]
pub struct ApprovalForAll {
    #[ink(topic)]
    pub owner: AccountId,
    #[ink(topic)]
    pub operator: AccountId,
    pub approved: bool,
}
```

### Property-Specific Events

```rust
#[ink(event)]
pub struct PropertyTokenMinted {
    #[ink(topic)]
    pub token_id: TokenId,
    #[ink(topic)]
    pub property_id: u64,
    #[ink(topic)]
    pub owner: AccountId,
}

#[ink(event)]
pub struct LegalDocumentAttached {
    #[ink(topic)]
    pub token_id: TokenId,
    #[ink(topic)]
    pub document_hash: Hash,
    #[ink(topic)]
    pub document_type: String,
}

#[ink(event)]
pub struct ComplianceVerified {
    #[ink(topic)]
    pub token_id: TokenId,
    #[ink(topic)]
    pub verified: bool,
    #[ink(topic)]
    pub verifier: AccountId,
}

#[ink(event)]
pub struct TokenBridged {
    #[ink(topic)]
    pub token_id: TokenId,
    #[ink(topic)]
    pub destination_chain: ChainId,
    #[ink(topic)]
    pub recipient: AccountId,
}
```

## Error Handling

```rust
#[derive(Debug, PartialEq, Eq, scale::Encode, scale::Decode)]
pub enum Error {
    // Standard ERC errors
    TokenNotFound,
    Unauthorized,
    // Property-specific errors
    PropertyNotFound,
    InvalidMetadata,
    DocumentNotFound,
    ComplianceFailed,
    // Cross-chain bridge errors
    BridgeNotSupported,
    InvalidChain,
    BridgeLocked,
}
```

## Integration Example

### Basic Usage

```rust
// Create a new property token contract
let mut contract = PropertyToken::new();

// Register a property with token
let metadata = PropertyMetadata {
    location: String::from("123 Main St, City, Country"),
    size: 2500, // square feet
    legal_description: String::from("Residential property with 3 bedrooms"),
    valuation: 750000,
    documents_url: String::from("ipfs://Qm..."),
};

let token_id = contract.register_property_with_token(metadata)?;

// Attach legal documents
let deed_hash = Hash::from([1u8; 32]);
contract.attach_legal_document(token_id, deed_hash, String::from("Deed"))?;

// Verify compliance
contract.verify_compliance(token_id, true)?;

// Transfer ownership
contract.transfer_from(accounts.alice, accounts.bob, token_id)?;
```

### Cross-Chain Usage

```rust
// Bridge token to another chain
contract.bridge_to_chain(2, token_id, recipient_on_chain_2)?;

// On destination chain, receive the bridged token
contract.receive_bridged_token(1, original_token_id, recipient)?;
```

## Security Considerations

### Access Control
- Only token owners can transfer their tokens
- Only approved operators can act on behalf of owners
- Only admin or designated bridge operators can verify compliance
- Only bridge operators can receive bridged tokens

### Compliance Verification
- Tokens must be verified as compliant before bridging
- Compliance status is tracked and auditable
- Verification requires proper authorization

### Bridge Security
- Tokens are locked during the bridging process
- Bridge operators are managed by admin
- Cross-chain transfers are tracked and verifiable

## Testing

The implementation includes comprehensive unit tests covering:

- ERC-721 standard compliance
- ERC-1155 batch operations
- Property-specific functionality
- Cross-chain bridge operations
- Error condition handling
- Edge cases and security scenarios

Tests are located in `tests/property_token_tests.rs`.

## Deployment

### Prerequisites
- Rust toolchain with ink! support
- cargo-contract CLI tool
- Properly configured Substrate node

### Build Process
```bash
# Navigate to the property-token directory
cd contracts/property-token

# Build the contract
cargo contract build

# Run tests
cargo test
```

### Deployment
The contract can be deployed using standard ink! deployment tools or through the provided deployment scripts in the project.

## Future Enhancements

### Planned Features
- Advanced metadata schemas for different property types
- Integration with real estate oracles for automatic valuation updates
- Fractional ownership support
- Rental income distribution mechanisms
- Governance features for property communities
- Enhanced cross-chain bridge protocols

### Performance Optimizations
- Merkle tree-based ownership proofs
- Batch registration for multiple properties
- Optimized storage patterns for large-scale deployments
- Gas optimization for frequent operations

## API Reference

For detailed API documentation, please refer to the inline documentation in the source code and the generated documentation from `cargo doc`.

## Support and Community

For questions, issues, or contributions:
- GitHub Issues: [Repository Issues](https://github.com/MettaChain/PropChain-contract/issues)
- Discord: [PropChain Community](https://discord.gg/propchain)
- Email: dev@propchain.io

---

*This documentation reflects version 1.0.0 of the Property Token Standard implementation.*