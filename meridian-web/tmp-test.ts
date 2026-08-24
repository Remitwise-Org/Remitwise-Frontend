import { buildMerkleTree, verifyProof, detectTamper, generateProof } from './lib/merkle-proof';

const leaves = ['leaf-1', 'leaf-2', 'leaf-3'];
const { root, layers } = buildMerkleTree(leaves);
console.log('root:', root);

const proof0 = generateProof(layers, 0);
console.log('proof0 valid:', verifyProof(leaves[0], proof0 ?? [], root));
console.log('proof1 valid:', verifyProof(leaves[1], generateProof(layers, 1) ?? [], root));
console.log('proof2 valid:', verifyProof(leaves[2], generateProof(layers, 2) ?? [], root));
console.log('forged rejected:', verifyProof('forged', ['tampered'], root));
console.log('tamper detected:', detectTamper(root, 'leaf-1', ['tampered']));
console.log('null test passed');
