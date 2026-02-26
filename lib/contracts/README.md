# Contract Integration Layer

This directory contains integration modules for Stellar smart contracts.

## family-wallet.ts

Contract read/write layer for the family wallet functionality.

**Status**: Stubbed - awaiting contract deployment

**Functions**:
- `getMember(id | address)` - Retrieve member data
- `getAllMembers(admin?)` - List all members
- `buildAddMemberTx(...)` - Build add member transaction
- `buildUpdateSpendingLimitTx(...)` - Build update limit transaction
- `checkSpendingLimit(...)` - Verify spending allowance

See `/docs/FAMILY_WALLET_INTEGRATION.md` for complete documentation.

## Contract ID Resolution

Server-side contract integrations resolve contract IDs by `SOROBAN_NETWORK` (`testnet` or `mainnet`) via `lib/contracts/contract-id-resolver.ts`.

Supported configuration:
- Network-specific env vars (example: `REMITTANCE_SPLIT_CONTRACT_ID_TESTNET`, `REMITTANCE_SPLIT_CONTRACT_ID_MAINNET`)
- `CONTRACT_IDS_JSON` with top-level `testnet` and `mainnet` keys
