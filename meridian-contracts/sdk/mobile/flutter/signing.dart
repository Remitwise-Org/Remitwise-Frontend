// Offline transaction signing utility for Flutter (Dart)
import 'package:web3dart/web3dart.dart';

Future<String> signTransactionOffline(Map<String, dynamic> txData, String privateKey) async {
  final credentials = EthPrivateKey.fromHex(privateKey);
  final tx = Transaction(
    to: EthereumAddress.fromHex(txData['to']),
    value: EtherAmount.inWei(BigInt.parse(txData['value'])),
    data: txData['data'] != null ? hexToBytes(txData['data']) : null,
    gasPrice: txData['gasPrice'] != null ? EtherAmount.inWei(BigInt.parse(txData['gasPrice'])) : null,
    maxGas: txData['gasLimit'],
  );
  final signed = await credentials.signTransaction(tx);
  return bytesToHex(signed, include0x: true);
}
