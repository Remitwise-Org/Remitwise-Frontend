# PropChain Mobile SDK Integration Guide

This documentation provides guidance for integrating the PropChain Mobile SDK into React Native and Flutter applications.

## Features
- Mobile-optimized contract interface
- Offline transaction signing
- QR code scanning for property info
- Push notification system
- Biometric authentication
- Mobile-specific error handling

## Directory Structure
- `sdk/mobile/common/` — Shared interfaces and logic
- `sdk/mobile/react-native/` — React Native SDK implementation
- `sdk/mobile/flutter/` — Flutter SDK implementation

## Integration Steps

### React Native
1. Install dependencies: `ethers`, `expo-barcode-scanner`, `expo-local-authentication`, `@react-native-firebase/messaging`, etc.
2. Import SDK modules from `sdk/mobile/react-native/`.
3. Use the provided interfaces and utilities to interact with PropChain contracts.

### Flutter
1. Add dependencies: `web3dart`, `qr_code_scanner`, `local_auth`, `firebase_messaging`, etc.
2. Import SDK modules from `sdk/mobile/flutter/`.
3. Use the provided interfaces and utilities to interact with PropChain contracts.

## Sample Apps
See `sdk/mobile/react-native/sample-app/` and `sdk/mobile/flutter/sample_app/` for starter templates.

## Error Handling & Recovery
- Use the provided error handling hooks to catch and recover from mobile-specific issues.

## Security
- Always store private keys securely (use OS keychain/secure storage).
- Use biometric authentication for sensitive actions.

## Support
For questions or issues, see the main project README or contact the maintainers.
