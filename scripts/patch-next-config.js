const fs = require('fs');
const path = require('path');

// Ensure node_modules/next/config.js exists for Storybook compatibility with Next.js 15+/16+
const nextConfigPath = path.join(process.cwd(), 'node_modules', 'next', 'config.js');
if (fs.existsSync(path.dirname(nextConfigPath)) && !fs.existsSync(nextConfigPath)) {
  fs.writeFileSync(
    nextConfigPath,
    'module.exports = function getConfig() { return { publicRuntimeConfig: {}, serverRuntimeConfig: {} }; };\n'
  );
  console.log('Created next/config.js shim for Storybook compatibility.');
}
