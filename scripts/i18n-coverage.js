#!/usr/bin/env node

/**
 * Computes i18n translation coverage for every locale against en.json
 * (see docs/i18n-message-extraction.md for why missing keys matter -- they
 * silently fall back to English for that locale's users).
 *
 * Usage:
 *   node scripts/i18n-coverage.js          Print the coverage and badge URL
 *   node scripts/i18n-coverage.js --write  Also update the badge in README.md
 */

const fs = require('fs');
const path = require('path');

function flattenKeys(tree, prefix = '') {
  if (typeof tree === 'string') return [prefix];
  return Object.entries(tree).flatMap(([key, value]) =>
    flattenKeys(value, prefix ? `${prefix}.${key}` : key)
  );
}

function computeCoverage(enTree, localeTree) {
  const enKeys = flattenKeys(enTree);
  const localeKeys = new Set(flattenKeys(localeTree));
  const translated = enKeys.filter((key) => localeKeys.has(key)).length;
  const total = enKeys.length;
  const percentage = total === 0 ? 100 : Math.round((translated / total) * 100);
  return { total, translated, percentage };
}

function badgeColor(percentage) {
  if (percentage >= 100) return 'brightgreen';
  if (percentage >= 80) return 'yellow';
  return 'red';
}

function buildBadgeUrl(percentage) {
  return `https://img.shields.io/badge/i18n%20coverage-${percentage}%25-${badgeColor(percentage)}`;
}

const README_PATH = path.join(__dirname, '..', 'README.md');
const START_MARKER = '<!-- i18n-coverage-badge:start -->';
const END_MARKER = '<!-- i18n-coverage-badge:end -->';

function updateReadme(percentage) {
  const badgeMarkdown = `${START_MARKER}\n![i18n coverage](${buildBadgeUrl(percentage)})\n${END_MARKER}`;
  const readme = fs.readFileSync(README_PATH, 'utf8');
  const pattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}`);

  if (!pattern.test(readme)) {
    throw new Error(`README.md is missing the ${START_MARKER} / ${END_MARKER} markers.`);
  }

  fs.writeFileSync(README_PATH, readme.replace(pattern, badgeMarkdown));
}

function main() {
  const en = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'lib/i18n/locales/en.json'), 'utf8')
  );
  const localeDir = path.join(__dirname, '..', 'lib/i18n/locales');
  const localeFiles = fs.readdirSync(localeDir)
    .filter((file) => file.endsWith('.json') && file !== 'en.json')
    .sort();
  const coverages = localeFiles.map((file) => {
    const locale = path.basename(file, '.json');
    const tree = JSON.parse(fs.readFileSync(path.join(localeDir, file), 'utf8'));
    const coverage = computeCoverage(en, tree);
    console.log(`${locale} coverage: ${coverage.translated}/${coverage.total} keys translated (${coverage.percentage}%)`);
    return coverage;
  });
  const percentage = coverages.length
    ? Math.min(...coverages.map(({ percentage }) => percentage))
    : 100;

  console.log(buildBadgeUrl(percentage));

  if (process.argv.includes('--write')) {
    updateReadme(percentage);
    console.log('Updated README.md badge.');
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

module.exports = { flattenKeys, computeCoverage, badgeColor, buildBadgeUrl };
