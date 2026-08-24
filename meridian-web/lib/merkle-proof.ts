export interface MerkleProof {
  leaf: string;
  proof: string[];
  root: string;
  leafIndex: number;
}

function simpleHash(value: string): string {
  let state = 0x811c9dc5;
  let state2 = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    state ^= value.charCodeAt(i);
    state = Math.imul(state, 0x01000193);
    state2 ^= value.charCodeAt(i);
    state2 = Math.imul(state2, 0x01000193);
  }
  const p1 = (state >>> 0).toString(16).padStart(8, '0');
  const p2 = (state2 >>> 0).toString(16).padStart(8, '0');
  return p1 + p2;
}

export function hashLeaf(value: string): string {
  return simpleHash(value);
}

export function hashNode(left: string, right: string): string {
  return simpleHash(`${left}:${right}`);
}

export function buildMerkleTree(leaves: string[]): { root: string; layers: string[][] } {
  if (leaves.length === 0) {
    return { root: '', layers: [] };
  }

  let currentLevel = leaves.map((l) => hashLeaf(l));
  const layers: string[][] = [currentLevel];

  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      const right = currentLevel[i + 1] ?? left;
      nextLevel.push(hashNode(left, right));
    }
    layers.push(nextLevel);
    currentLevel = nextLevel;
  }

  return { root: currentLevel[0], layers };
}

export function generateProof(layers: string[][], index: number): string[] | null {
  if (index < 0 || index >= (layers[0]?.length ?? 0)) {
    return null;
  }

  const proof: string[] = [];
  let currentIndex = index;

  for (let level = 0; level < layers.length - 1; level++) {
    const levelSize = layers[level].length;
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;
    const sibling = siblingIndex < levelSize ? layers[level][siblingIndex] : layers[level][currentIndex];
    proof.push(sibling);
    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

export function verifyProof(leaf: string, proof: string[], root: string): boolean {
  if (!leaf || !root) {
    return false;
  }

  let candidates = [hashLeaf(leaf)];
  for (const sibling of proof) {
    const nextCandidates: string[] = [];
    for (const candidate of candidates) {
      nextCandidates.push(hashNode(candidate, sibling));
      nextCandidates.push(hashNode(sibling, candidate));
    }
    candidates = nextCandidates;
  }

  return candidates.includes(root);
}

export function detectTamper(root: string, leaf: string, proof: string[]): boolean {
  return !verifyProof(leaf, proof, root);
}
