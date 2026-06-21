// Vitest setup - extend expect() with jest-dom matchers (toBeInTheDocument, etc.)
// The /vitest entry registers the matchers against Vitest's expect and augments
// its Assertion types, which is the correct integration path for Vitest 4.x.
import '@testing-library/jest-dom/vitest';
