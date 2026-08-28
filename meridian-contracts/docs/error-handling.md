# Error Handling and Recovery Guide

## Overview

This document provides comprehensive information about error handling in the PropChain smart contract system. All contracts implement robust error handling with detailed error messages, recovery suggestions, and error categorization.

## Error Categories

Errors in the PropChain system are categorized into the following types:

### UserError
Errors caused by invalid user input or actions that can be corrected by the user.

**Examples:**
- Invalid property metadata
- Insufficient funds
- Invalid token ID

**Recovery:** Check input parameters and retry with correct values.

### SystemError
Internal system errors that may require contract administrator intervention.

**Examples:**
- Contract state inconsistencies
- Storage access failures
- Internal logic errors

**Recovery:** Contact contract administrator if issue persists.

### NetworkError
Errors related to network or external service failures.

**Examples:**
- IPFS network failures
- Cross-chain bridge timeouts
- Oracle data unavailability

**Recovery:** Wait and retry, or check network connectivity.

### ValidationError
Input validation failures.

**Examples:**
- Missing required fields
- Invalid data format
- Out-of-range values

**Recovery:** Check input parameters and try again.

### AuthorizationError
Permission and access control errors.

**Examples:**
- Unauthorized access attempts
- Missing required permissions
- Invalid caller

**Recovery:** Ensure you have the required permissions or contact the contract owner.

### StateError
Contract state inconsistencies.

**Examples:**
- Unexpected contract state
- State transition failures
- Concurrent modification conflicts

**Recovery:** Wait for the contract state to update or check transaction status.

## Error Severity Levels

### Low
Informational errors that don't prevent operation continuation.

### Medium
Warnings that may affect operation but don't cause failure.

### High
Operation failures that require attention.

### Critical
System integrity at risk - immediate action required.

## Common Errors by Contract

### Property Token Contract

#### `TokenNotFound`
**Category:** UserError  
**Severity:** Medium  
**Message:** The specified token ID does not exist.

**Recovery Suggestions:**
1. Verify the token ID is correct
2. Check if the token has been transferred or burned
3. Query the contract for available tokens

#### `Unauthorized`
**Category:** AuthorizationError  
**Severity:** High  
**Message:** Caller does not have permission to perform this action.

**Recovery Suggestions:**
1. Ensure you are the token owner or approved operator
2. Check if you have the required permissions
3. Contact the contract owner if you believe this is an error

#### `PropertyNotFound`
**Category:** UserError  
**Severity:** Medium  
**Message:** The specified property does not exist.

**Recovery Suggestions:**
1. Verify the property ID is correct
2. Check if the property has been registered
3. Query the contract for available properties

#### `InvalidMetadata`
**Category:** ValidationError  
**Severity:** Low  
**Message:** Property metadata is invalid or incomplete.

**Recovery Suggestions:**
1. Ensure all required fields are provided
2. Check data format and types
3. Verify metadata size limits

#### `ComplianceFailed`
**Category:** ValidationError  
**Severity:** High  
**Message:** Property does not meet compliance requirements.

**Recovery Suggestions:**
1. Review compliance requirements
2. Complete missing compliance checks
3. Contact compliance administrator

#### `BridgeNotSupported`
**Category:** SystemError  
**Severity:** Medium  
**Message:** Cross-chain bridge is not supported for this operation.

**Recovery Suggestions:**
1. Check if bridge is enabled for the target chain
2. Verify bridge configuration
3. Contact bridge administrator

#### `InsufficientSignatures`
**Category:** ValidationError  
**Severity:** High  
**Message:** Not enough signatures collected for bridge operation.

**Recovery Suggestions:**
1. Wait for additional signatures
2. Check bridge operator status
3. Verify signature requirements

#### `RequestExpired`
**Category:** StateError  
**Severity:** Medium  
**Message:** Bridge request has expired.

**Recovery Suggestions:**
1. Create a new bridge request
2. Check request expiration time
3. Retry the operation

### Escrow Contract

#### `EscrowNotFound`
**Category:** UserError  
**Severity:** Medium  
**Message:** The specified escrow does not exist.

**Recovery Suggestions:**
1. Verify the escrow ID is correct
2. Check if escrow has been created
3. Query the contract for available escrows

#### `InsufficientFunds`
**Category:** UserError  
**Severity:** High  
**Message:** Insufficient funds in escrow for this operation.

**Recovery Suggestions:**
1. Deposit additional funds to escrow
2. Check escrow balance
3. Verify required amount

#### `ConditionsNotMet`
**Category:** ValidationError  
**Severity:** Medium  
**Message:** Escrow release conditions have not been met.

**Recovery Suggestions:**
1. Review escrow conditions
2. Complete required conditions
3. Check condition status

#### `SignatureThresholdNotMet`
**Category:** ValidationError  
**Severity:** High  
**Message:** Not enough signatures collected for multi-signature operation.

**Recovery Suggestions:**
1. Wait for additional signatures
2. Check required signature count
3. Verify signer permissions

#### `TimeLockActive`
**Category:** StateError  
**Severity:** Medium  
**Message:** Time lock is still active for this escrow.

**Recovery Suggestions:**
1. Wait for time lock to expire
2. Check time lock expiration time
3. Retry after time lock expires

### Oracle Contract

#### `PropertyNotFound`
**Category:** UserError  
**Severity:** Medium  
**Message:** Property valuation not found.

**Recovery Suggestions:**
1. Request a new valuation
2. Check if property is registered
3. Wait for oracle to update

#### `OracleError`
**Category:** NetworkError  
**Severity:** High  
**Message:** Oracle service error.

**Recovery Suggestions:**
1. Wait and retry
2. Check oracle service status
3. Contact oracle administrator

### Compliance Registry Contract

#### `NotCompliant`
**Category:** ValidationError  
**Severity:** High  
**Message:** Entity does not meet compliance requirements.

**Recovery Suggestions:**
1. Review compliance requirements
2. Complete missing compliance checks
3. Submit compliance documentation

#### `ComplianceCheckFailed`
**Category:** SystemError  
**Severity:** High  
**Message:** Compliance registry call failed.

**Recovery Suggestions:**
1. Retry the compliance check
2. Check compliance registry status
3. Contact compliance administrator

## Error Handling Best Practices

### For dApp Developers

1. **Always handle errors gracefully**
   - Never ignore error responses
   - Display user-friendly error messages
   - Provide recovery suggestions to users

2. **Categorize errors appropriately**
   - User errors: Show clear messages with actionable steps
   - System errors: Log for debugging and notify administrators
   - Network errors: Implement retry logic with exponential backoff

3. **Implement error logging**
   - Log all errors with context
   - Track error rates
   - Monitor for error patterns

4. **Provide recovery workflows**
   - Guide users through error resolution
   - Implement automatic retry for transient errors
   - Offer alternative paths when possible

### For Contract Developers

1. **Use proper error types**
   - Return `Result<T, Error>` instead of panicking
   - Never use `unwrap()` or `expect()` in production code
   - Provide detailed error messages

2. **Categorize errors correctly**
   - User errors: Input validation failures
   - System errors: Internal contract issues
   - Network errors: External service failures

3. **Add recovery suggestions**
   - Include actionable steps in error messages
   - Provide context about what went wrong
   - Suggest alternative approaches

4. **Log errors appropriately**
   - Use error logging for monitoring
   - Track error rates and patterns
   - Emit events for important errors

## Error Rate Monitoring

The error handling system includes error rate monitoring capabilities:

- **Error counts per account:** Track how many times each account encounters specific errors
- **Error rates over time:** Monitor error frequency to detect issues
- **Recent error log:** Keep a log of recent errors for debugging

### Monitoring Best Practices

1. **Set up alerts** for high error rates
2. **Track error trends** over time
3. **Analyze error patterns** to identify root causes
4. **Review error logs** regularly for system health

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue: "TokenNotFound" when querying token
**Solution:**
1. Verify the token ID is correct
2. Check if token exists using `total_supply()` and `token_by_index()`
3. Ensure you're querying the correct contract address

#### Issue: "Unauthorized" when trying to transfer
**Solution:**
1. Verify you are the token owner
2. Check if you have been approved as an operator
3. Ensure the caller account is correct

#### Issue: "InsufficientSignatures" in bridge operation
**Solution:**
1. Wait for additional bridge operators to sign
2. Check bridge operator status
3. Verify signature requirements in bridge configuration

#### Issue: "ComplianceFailed" when registering property
**Solution:**
1. Review compliance requirements
2. Complete all required compliance checks
3. Submit compliance documentation
4. Contact compliance administrator

#### Issue: "NetworkError" when accessing IPFS metadata
**Solution:**
1. Check network connectivity
2. Verify IPFS gateway is accessible
3. Retry the operation
4. Check IPFS CID is valid

## Error Recovery Workflows

### Property Registration Failure

1. **Check error category:**
   - If ValidationError: Review and fix input data
   - If AuthorizationError: Verify permissions
   - If SystemError: Contact administrator

2. **Review error message** for specific issues

3. **Follow recovery suggestions** provided in error

4. **Retry operation** after addressing issues

### Token Transfer Failure

1. **Verify token ownership**
2. **Check approval status** if using operator
3. **Ensure sufficient balance**
4. **Check contract pause status**
5. **Retry transfer** after resolving issues

### Bridge Operation Failure

1. **Check bridge status** (paused/active)
2. **Verify chain support**
3. **Check signature requirements**
4. **Review request expiration**
5. **Create new request** if expired

## Error Code Reference

### Property Token Contract Error Codes

- `TOKEN_NOT_FOUND`: Token ID does not exist
- `UNAUTHORIZED`: Caller lacks required permissions
- `PROPERTY_NOT_FOUND`: Property does not exist
- `INVALID_METADATA`: Metadata validation failed
- `DOCUMENT_NOT_FOUND`: Document does not exist
- `COMPLIANCE_FAILED`: Compliance check failed
- `BRIDGE_NOT_SUPPORTED`: Bridge not available
- `INVALID_CHAIN`: Invalid chain ID
- `BRIDGE_LOCKED`: Bridge is locked
- `INSUFFICIENT_SIGNATURES`: Not enough signatures
- `REQUEST_EXPIRED`: Bridge request expired
- `INVALID_REQUEST`: Invalid bridge request
- `BRIDGE_PAUSED`: Bridge is paused
- `GAS_LIMIT_EXCEEDED`: Gas limit exceeded
- `METADATA_CORRUPTION`: Metadata corruption detected
- `INVALID_BRIDGE_OPERATOR`: Invalid bridge operator
- `DUPLICATE_BRIDGE_REQUEST`: Duplicate bridge request
- `BRIDGE_TIMEOUT`: Bridge operation timed out
- `ALREADY_SIGNED`: Request already signed by this operator

### Escrow Contract Error Codes

- `ESCROW_NOT_FOUND`: Escrow does not exist
- `UNAUTHORIZED`: Caller lacks required permissions
- `INVALID_STATUS`: Invalid escrow status
- `INSUFFICIENT_FUNDS`: Insufficient funds in escrow
- `CONDITIONS_NOT_MET`: Release conditions not met
- `SIGNATURE_THRESHOLD_NOT_MET`: Not enough signatures
- `ALREADY_SIGNED`: Already signed this request
- `DOCUMENT_NOT_FOUND`: Document does not exist
- `DISPUTE_ACTIVE`: Dispute is active
- `TIME_LOCK_ACTIVE`: Time lock is active
- `INVALID_CONFIGURATION`: Invalid escrow configuration
- `ESCROW_ALREADY_FUNDED`: Escrow already funded
- `PARTICIPANT_NOT_FOUND`: Participant does not exist

## Support and Reporting

If you encounter errors that are not covered in this guide:

1. **Check error message** for specific details
2. **Review recovery suggestions** provided
3. **Check contract documentation** for additional information
4. **Report issues** to the PropChain development team with:
   - Error code and message
   - Contract address and transaction hash
   - Steps to reproduce
   - Expected vs actual behavior

## Additional Resources

- [Contract Documentation](./contracts.md)
- [Integration Guide](./integration.md)
- [Architecture Documentation](./architecture.md)
- [Security Best Practices](./security_pipeline.md)
