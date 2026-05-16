/**
 * Unit test: rate-limit (Feature #1 — Chatbot Trouveur)
 *
 * Tests the in-memory rate limiter from src/lib/rate-limit.ts.
 * Since rate-limit uses an in-memory Map, tests run sequentially
 * and each test uses unique keys to avoid interference.
 *
 * Run: bun run __tests__/rate-limit.test.ts
 */
import { rateLimit } from '../src/lib/rate-limit';

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

console.log('=== rate-limit.test.ts ===\n');

// --- Test 1: First request → false (not rate limited) ---
console.log('--- Basic rate limiting ---');
assert(
  rateLimit('test:first-req', { maxRequests: 3, windowMs: 60000 }) === false,
  'First request → not limited'
);

// --- Test 2: Within limit → false ---
assert(
  rateLimit('test:within-limit', { maxRequests: 3, windowMs: 60000 }) === false,
  'Request 1 of 3 → not limited'
);
assert(
  rateLimit('test:within-limit', { maxRequests: 3, windowMs: 60000 }) === false,
  'Request 2 of 3 → not limited'
);
assert(
  rateLimit('test:within-limit', { maxRequests: 3, windowMs: 60000 }) === false,
  'Request 3 of 3 → not limited'
);

// --- Test 3: Exceeding limit → true ---
console.log('\n--- Exceeding limit ---');
assert(
  rateLimit('test:exceed', { maxRequests: 2, windowMs: 60000 }) === false,
  'Request 1 of 2 → not limited'
);
assert(
  rateLimit('test:exceed', { maxRequests: 2, windowMs: 60000 }) === false,
  'Request 2 of 2 → not limited'
);
assert(
  rateLimit('test:exceed', { maxRequests: 2, windowMs: 60000 }) === true,
  'Request 3 of 2 → LIMITED (429)'
);
assert(
  rateLimit('test:exceed', { maxRequests: 2, windowMs: 60000 }) === true,
  'Request 4 of 2 → still LIMITED'
);

// --- Test 4: Different keys → independent ---
console.log('\n--- Key independence ---');
// Fill key A
assert(
  rateLimit('test:indep-a', { maxRequests: 1, windowMs: 60000 }) === false,
  'Key A: request 1 → not limited'
);
assert(
  rateLimit('test:indep-a', { maxRequests: 1, windowMs: 60000 }) === true,
  'Key A: request 2 → LIMITED'
);
// Key B should be independent
assert(
  rateLimit('test:indep-b', { maxRequests: 1, windowMs: 60000 }) === false,
  'Key B: request 1 → not limited (independent from A)'
);
assert(
  rateLimit('test:indep-b', { maxRequests: 1, windowMs: 60000 }) === true,
  'Key B: request 2 → LIMITED'
);

// --- Test 5: Window expiration → resets ---
console.log('\n--- Window expiration (100ms window) ---');
assert(
  rateLimit('test:expire', { maxRequests: 1, windowMs: 100 }) === false,
  '100ms window: request 1 → not limited'
);
assert(
  rateLimit('test:expire', { maxRequests: 1, windowMs: 100 }) === true,
  '100ms window: request 2 → LIMITED'
);

// Wait for window to expire
await new Promise((resolve) => setTimeout(resolve, 150));

assert(
  rateLimit('test:expire', { maxRequests: 1, windowMs: 100 }) === false,
  'After 150ms: request 1 → not limited (window reset)'
);
assert(
  rateLimit('test:expire', { maxRequests: 1, windowMs: 100 }) === true,
  'After 150ms: request 2 → LIMITED again'
);

// --- Test 6: Default options ---
console.log('\n--- Default options ---');
assert(
  rateLimit('test:defaults-1') === false,
  'Default options: request 1 → not limited'
);
assert(
  rateLimit('test:defaults-2') === false,
  'Default options: different key → not limited'
);
assert(
  rateLimit('test:defaults-1') === false,
  'Default options: first key again → not limited (3 default max)'
);

// --- Test 7: Single request limit ---
console.log('\n--- Single request limit ---');
assert(
  rateLimit('test:single', { maxRequests: 1, windowMs: 60000 }) === false,
  'maxRequests=1: request 1 → not limited'
);
assert(
  rateLimit('test:single', { maxRequests: 1, windowMs: 60000 }) === true,
  'maxRequests=1: request 2 → LIMITED'
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
