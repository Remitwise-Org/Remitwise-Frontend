CREATE TABLE "AuthNonce" (
    "address"   TEXT NOT NULL PRIMARY KEY,
    "nonce"     TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL
);
