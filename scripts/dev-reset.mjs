#!/usr/bin/env node
// Prints the URL that clears the app's localStorage. A Node script has no
// way to reach into a running browser's storage directly, so `dev:reset`
// points you at the client-side handler in components/dev/DevResetHandler.tsx
// instead of pretending to do the clearing itself.
const port = process.env.PORT || 3000;
const url = `http://localhost:${port}/?dev-reset`;

console.log(`\nVisit this URL in your browser to clear the app's localStorage:\n\n  ${url}\n`);
