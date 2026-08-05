# Seeds a demo bill by POSTing to the local dev server's /api/bills route
# (must be running via `npm run dev`) and prints the unsigned transaction
# XDR it builds. See scripts/seed-invoice.mjs for details.
seed-invoice:
    node scripts/seed-invoice.mjs
