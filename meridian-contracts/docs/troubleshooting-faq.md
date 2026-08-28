# Troubleshooting and FAQ

This document provides solutions to common issues and answers to frequently asked questions for developers working with PropChain smart contracts.

## Common Issues

### 1. Compliance Verification Failure
**Issue:** Submitting a transaction returns `ComplianceFailed` or `ComplianceError::NotVerified`.
**Solution:**
- Ensure the account has undergone KYC/AML verification via the `ComplianceRegistry`.
- Check if the verification has expired using `get_compliance_data`.
- Verify that GDPR consent has been granted via `update_consent`.

### 2. Bridge Request Timeout
**Issue:** A bridge request has not been executed and the timeout has passed.
**Solution:**
- Bridge operators may be offline or experiencing high network congestion.
- Use `recover_failed_bridge` with `RecoveryAction::UnlockToken` to retrieve your token on the source chain.
- Try re-initiating the bridge with a higher gas estimate or longer timeout.

### 3. "InsufficientSignatures" Error on Bridge Execution
**Issue:** Calling `execute_bridge` fails with `InsufficientSignatures`.
**Solution:**
- Verify that the required number of bridge operators have signed the request using `monitor_bridge_status`.
- Wait for more signatures if the threshold has not been met.

### 4. IPFS CID Validation Error
**Issue:** Registering metadata or documents fails with `InvalidIpfsCid`.
**Solution:**
- Ensure the CID format is correct (CIDv0 starts with "Qm", CIDv1 starts with "b").
- Check if the CID string is exactly 46 characters for CIDv0.

### 5. Insurance Premium Calculation Discrepancy
**Issue:** The premium calculated off-chain doesn't match the on-chain value.
**Solution:**
- Ensure you are using the exact same risk assessment parameters.
- Check if the `PropertyValuation` has updated since the last calculation.
- On-chain premium calculation factors in real-time pool utilization and reinsurance costs.

## Frequently Asked Questions

### Q: Which standards are PropChain tokens compatible with?
A: PropChain property tokens are natively compatible with both ERC-721 (for unique property ownership) and ERC-1155 (for fractionalized or batch operations).

### Q: How is data privacy handled for compliance?
A: We use a combination of encrypted data hashes in the `ComplianceRegistry` and private Zero-Knowledge proofs in `ZkCompliance` to ensure regulatory requirements are met without exposing sensitive personal information on-chain.

### Q: Can a property be un-tokenized?
A: Yes, if the business logic allows, a token can be burned, and the property status can be updated to "Unlisted" or "Private" in the registry, effectively removing it from the blockchain lifecycle.

### Q: What happens if a bridge operator is malicious?
A: The bridge uses a multi-signature threshold. A single malicious operator cannot compromise a bridge request. Operators are authorized through a governance process and can be removed/slashed for bad behavior.

### Q: How often are property valuations updated?
A: Valuations depend on the `PropertyValuationOracle` configuration. High-volatility markets may have daily updates, while stable assets might be updated monthly or upon request.
