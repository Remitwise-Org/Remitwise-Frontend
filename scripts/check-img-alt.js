#!/usr/bin/env node

/**
 * Build-time lint check to ensure all <img> and <Image /> tags specify an 'alt' attribute.
 * Fails the build with exit code 1 if any missing 'alt' attribute is detected.
 */

const fs = require('fs');
const path = require('path');

const TARGET_DIRS = ['app', 'components', 'src', 'lib', 'pages', 'public'];
const TARGET_EXTS = new Set(['.tsx', '.jsx', '.html', '.ts', '.js']);

function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next') {
        getFiles(fullPath, fileList);
      }
    } else if (TARGET_EXTS.has(path.extname(entry.name))) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const violations = [];
  
  // Match <img ...> or <Image ...> tags (including multiline)
  const tagRegex = /<(img|Image)\b([\s\S]*?)>/g;
  let match;

  while ((match = tagRegex.exec(content)) !== null) {
    const tagName = match[1];
    const attributes = match[2];
    const fullTag = match[0];
    const matchIndex = match.index;

    // Calculate line number
    const lineNumber = content.substring(0, matchIndex).split('\n').length;

    // Check if alt attribute is present (alt=, alt , or alt={...})
    const hasAlt = /\balt\s*=/i.test(attributes) || /\balt\b/i.test(attributes);

    if (!hasAlt) {
      violations.push({
        filePath,
        lineNumber,
        tagName,
        snippet: fullTag.replace(/\s+/g, ' ').substring(0, 80),
      });
    }
  }

  return violations;
}

function run() {
  const rootDir = process.cwd();
  let allFiles = [];

  for (const dirName of TARGET_DIRS) {
    const dirPath = path.join(rootDir, dirName);
    allFiles = allFiles.concat(getFiles(dirPath));
  }

  const allViolations = [];
  for (const file of allFiles) {
    const violations = checkFile(file);
    allViolations.push(...violations);
  }

  if (allViolations.length > 0) {
    console.error('\n❌ Accessibility Build Check Failed: Missing "alt" attribute detected!\n');
    for (const v of allViolations) {
      const relativePath = path.relative(rootDir, v.filePath);
      console.error(`  - ${relativePath}:${v.lineNumber} <${v.tagName}> missing alt attribute`);
      console.error(`    Snippet: ${v.snippet}\n`);
    }
    console.error(`Total violations found: ${allViolations.length}`);
    process.exit(1);
  }

  console.log(`✓ Image alt check passed (${allFiles.length} files scanned, 0 missing alt violations).`);
  process.exit(0);
}

if (require.main === module) {
  run();
}

module.exports = { checkFile, getFiles };
