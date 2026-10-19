import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { checkFile } from '../../scripts/check-img-alt.js';

describe('check-img-alt build script', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'img-alt-test-'));
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns 0 violations when all <img> and <Image /> tags specify an alt attribute', () => {
    const validFile = path.join(tempDir, 'ValidComponent.tsx');
    const content = `
      import Image from "next/image";
      export function ValidComponent() {
        return (
          <div>
            <img src="/logo.svg" alt="Company Logo" />
            <Image src="/avatar.png" alt="User avatar" width={40} height={40} />
            <Image
              src="/banner.jpg"
              alt="Dashboard banner"
              fill
            />
          </div>
        );
      }
    `;
    fs.writeFileSync(validFile, content, 'utf8');

    const violations = checkFile(validFile);
    expect(violations).toHaveLength(0);
  });

  it('detects <img> tags lacking an alt attribute', () => {
    const invalidFile = path.join(tempDir, 'MissingAltImg.tsx');
    const content = `
      export function MissingAltImg() {
        return <img src="/logo.svg" className="w-10 h-10" />;
      }
    `;
    fs.writeFileSync(invalidFile, content, 'utf8');

    const violations = checkFile(invalidFile);
    expect(violations).toHaveLength(1);
    expect(violations[0].tagName).toBe('img');
    expect(violations[0].lineNumber).toBe(3);
  });

  it('detects multiline <Image /> tags lacking an alt attribute', () => {
    const invalidFile = path.join(tempDir, 'MissingAltImage.tsx');
    const content = `
      import Image from "next/image";
      export function MissingAltImage() {
        return (
          <Image
            src="/hero.png"
            width={500}
            height={300}
          />
        );
      }
    `;
    fs.writeFileSync(invalidFile, content, 'utf8');

    const violations = checkFile(invalidFile);
    expect(violations).toHaveLength(1);
    expect(violations[0].tagName).toBe('Image');
    expect(violations[0].lineNumber).toBe(5);
  });
});
