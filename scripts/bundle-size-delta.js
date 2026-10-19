#!/usr/bin/env node
/**
 * Issue #1437 – compute the client bundle size and its delta vs a committed
 * baseline, for surfacing on every PR.
 *
 * Measures every JS asset under .next/static (the client-shipped bundles),
 * reports per-directory rollups and the total, and compares against
 * scripts/bundle-size-baseline.json. Refresh the baseline deliberately with
 * `node scripts/bundle-size-delta.js --update` in the PR that changes it.
 *
 * Output: a markdown table on stdout (suitable for $GITHUB_STEP_SUMMARY /
 * a PR comment) and a non-zero exit ONLY on missing build, never on growth —
 * this is a surface, not a gate.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STATIC_DIR = path.join(ROOT, ".next", "static");
const BASELINE = path.join(__dirname, "bundle-size-baseline.json");

function collect() {
  if (!fs.existsSync(STATIC_DIR)) {
    console.error("❌ .next/static not found — run `npm run build` first");
    process.exit(1);
  }
  const groups = {};
  let total = 0;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".js")) {
        const size = fs.statSync(p).size;
        let group = path.relative(STATIC_DIR, dir).split(path.sep)[0] || ".";
        // Next writes some assets under a per-build hash directory; fold
        // those into one stable bucket so the baseline never churns on the
        // build ID itself.
        if (/^[A-Za-z0-9_-]{16,}$/.test(group) && group !== "chunks") group = "build-meta";
        groups[group] = (groups[group] || 0) + size;
        total += size;
      }
    }
  };
  walk(STATIC_DIR);
  groups.TOTAL = total;
  return groups;
}

const current = collect();

if (process.argv.includes("--update")) {
  fs.writeFileSync(BASELINE, JSON.stringify(current, null, 2) + "\n");
  console.log(`✅ bundle size baseline updated at ${path.relative(ROOT, BASELINE)}`);
  process.exit(0);
}

const kb = (b) => `${(b / 1024).toFixed(1)} KiB`;

if (!fs.existsSync(BASELINE)) {
  console.log("⚠️ No baseline — run `node scripts/bundle-size-delta.js --update` after a clean build.");
  console.log(`Current total client JS: ${kb(current.TOTAL)}`);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(BASELINE, "utf8"));
const names = [...new Set([...Object.keys(baseline), ...Object.keys(current)])]
  .filter((n) => n !== "TOTAL")
  .sort();

console.log("### Client bundle size delta\n");
console.log("| group | baseline | current | delta |");
console.log("|---|---:|---:|---:|");
for (const name of [...names, "TOTAL"]) {
  const b = baseline[name] || 0;
  const c = current[name] || 0;
  const d = c - b;
  const pct = b ? ` (${d >= 0 ? "+" : ""}${((100 * d) / b).toFixed(2)}%)` : "";
  const marker = d > 0 ? " 🔺" : d < 0 ? " 🔽" : "";
  console.log(`| ${name} | ${kb(b)} | ${kb(c)} | ${d >= 0 ? "+" : ""}${kb(d).replace("-", "−")}${pct}${marker} |`);
}
