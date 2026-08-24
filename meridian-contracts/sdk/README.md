# SDK

This directory contains client-facing adapters that connect applications to the contract system.

## Architecture

The SDK layer is split between backend storage support in [backend](backend) and mobile integration helpers in [mobile](mobile/README.md). The backend currently uses a NestJS module for storage endpoints, while mobile contains shared TypeScript and Dart interfaces plus React Native and Flutter helpers.

The backend package manifest can be found in [backend/package.json](backend/package.json).

The mobile integration guide can be found in [mobile/INTEGRATION_GUIDE.md](mobile/INTEGRATION_GUIDE.md).

## Logic Tracking

To find backend bootstrap logic visit [backend/src/main.ts](backend/src/main.ts).

To find backend storage controller logic visit [backend/src/storage/storage.controller.ts](backend/src/storage/storage.controller.ts).

To find backend storage service logic visit [backend/src/storage/storage.service.ts](backend/src/storage/storage.service.ts).

To find shared mobile TypeScript contract interfaces visit [mobile/common/contract_interface.ts](mobile/common/contract_interface.ts).

To find shared mobile Dart contract interfaces visit [mobile/common/contract_interface.dart](mobile/common/contract_interface.dart).

To find React Native signing logic visit [mobile/react-native/signing.ts](mobile/react-native/signing.ts).

To find Flutter signing logic visit [mobile/flutter/signing.dart](mobile/flutter/signing.dart).

The SDK connection layer can be found in [mobile/README.md](mobile/README.md).

## Tradeoffs

SDK docs stay at this level because the mobile and backend folders already have their own implementation details. This README is the bridge between contract contributors and application integrators.

This README does not duplicate every mobile helper. The tradeoff is that contributors should follow the links into the platform-specific folders when they need implementation details.
