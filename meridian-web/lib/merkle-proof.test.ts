import { describe, expect, it } from 'vitest';
import { buildMerkleTree, detectTamper, generateProof, hashLeaf, hashNode, verifyProof } from '@/lib/merkle-proof';

describe('merkle-proof', () => {
  it('hashes leaves consistently', () => {
    expect(hashLeaf('a')).toBe(hashLeaf('a'));
    expect(hashLeaf('a')).not.toBe(hashLeaf('b'));
  });

  it('hashes nodes consistently', () => {
    const a = hashLeaf('a');
    const b = hashLeaf('b');
    expect(hashNode(a, b)).toBe(hashNode(a, b));
  });

  it('builds a verifiable Merkle tree', () => {
    const leaves = ['leaf-1', 'leaf-2', 'leaf-3'];
    const { root, layers } = buildMerkleTree(leaves);
    expect(root).toBeTruthy();

    const proof = generateProof(layers, 2);
    expect(proof).not.toBeNull();
    expect(verifyProof(leaves[2], proof ?? [], root)).toBe(true);
  });

  it('rejects a forged proof', () => {
    const { root } = buildMerkleTree(['leaf-1', 'leaf-2']);
    expect(verifyProof('forged-leaf', ['fake-sibling'], root)).toBe(false);
  });

  it('detects a tampered proof', () => {
    const { root } = buildMerkleTree(['leaf-1', 'leaf-2']);
    expect(detectTamper(root, 'leaf-1', ['tampered-sibling'])).toBe(true);
  });

  it('returns null proof for out-of-range index', () => {
    const { layers } = buildMerkleTree(['leaf-1']);
    expect(generateProof(layers, 5)).toBeNull();
  });
});
