# Mobile-Optimized Contract Interface (Dart)

abstract class PropChainMobileSDK {
  Future<PropertyInfo> getPropertyInfo(String propertyId);
  Future<TransactionResult> transferProperty(String propertyId, String to);
  Future<String> signTransactionOffline(Map<String, dynamic> txData);
  Future<String> scanQRCode();
  void subscribeToPropertyUpdates(String propertyId, void Function(dynamic update) callback);
  Future<bool> authenticateBiometric();
  void onError(void Function(String error) callback);
}

class PropertyInfo {
  final String id;
  final String owner;
  final String location;
  final double valuation;
  final String metadataUri;

  PropertyInfo(this.id, this.owner, this.location, this.valuation, this.metadataUri);
}

class TransactionResult {
  final String txHash;
  final String status; // 'pending', 'confirmed', 'failed'
  final String? error;

  TransactionResult(this.txHash, this.status, [this.error]);
}
