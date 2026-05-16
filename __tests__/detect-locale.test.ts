/**
 * Unit test: detect-locale (Feature #3 — Auto Translation)
 * Run: bun run __tests__/detect-locale.test.ts
 */
import { detectLocaleFromHeaders } from '../src/lib/i18n';

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

console.log('=== detect-locale.test.ts ===\n');

// Test 1: Cookie qrtrans_locale=en → should return 'en'
console.log('--- Cookie detection ---');
assert(
  detectLocaleFromHeaders(new Headers({ cookie: 'qrtrans_locale=en' })) === 'en',
  'Cookie qrtrans_locale=en → en'
);

// Test 2: Cookie qrtrans_locale=ar → should return 'ar'
assert(
  detectLocaleFromHeaders(new Headers({ cookie: 'qrtrans_locale=ar' })) === 'ar',
  'Cookie qrtrans_locale=ar → ar'
);

// Test 3: Cookie qrtrans_locale=fr → should return 'fr'
assert(
  detectLocaleFromHeaders(new Headers({ cookie: 'qrtrans_locale=fr' })) === 'fr',
  'Cookie qrtrans_locale=fr → fr'
);

// Test 4: Accept-Language fr-FR → should return 'fr'
console.log('\n--- Accept-Language detection ---');
assert(
  detectLocaleFromHeaders(new Headers({ 'accept-language': 'fr-FR,fr;q=0.9' })) === 'fr',
  'Accept-Language: fr-FR → fr'
);

// Test 5: Accept-Language ar-SA → should return 'ar'
assert(
  detectLocaleFromHeaders(new Headers({ 'accept-language': 'ar-SA,ar;q=0.9' })) === 'ar',
  'Accept-Language: ar-SA → ar'
);

// Test 6: Accept-Language de-DE → should fallback to 'fr'
assert(
  detectLocaleFromHeaders(new Headers({ 'accept-language': 'de-DE,de;q=0.9' })) === 'fr',
  'Accept-Language: de-DE → fr (fallback)'
);

// Test 7: Accept-Language en-US → should return 'en'
assert(
  detectLocaleFromHeaders(new Headers({ 'accept-language': 'en-US,en;q=0.9' })) === 'en',
  'Accept-Language: en-US → en'
);

// Test 8: No headers at all → should return 'fr'
console.log('\n--- Fallback ---');
assert(
  detectLocaleFromHeaders(new Headers({})) === 'fr',
  'No headers → fr (fallback)'
);

// Test 9: Cookie takes priority over Accept-Language
console.log('\n--- Cookie priority ---');
assert(
  detectLocaleFromHeaders(new Headers({
    cookie: 'qrtrans_locale=en',
    'accept-language': 'ar-SA,ar;q=0.9',
  })) === 'en',
  'Cookie en + Accept-Language ar → en (cookie wins)'
);

assert(
  detectLocaleFromHeaders(new Headers({
    cookie: 'qrtrans_locale=ar',
    'accept-language': 'fr-FR,fr;q=0.9',
  })) === 'ar',
  'Cookie ar + Accept-Language fr → ar (cookie wins)'
);

// Test 10: Cookie with other cookies present
console.log('\n--- Cookie parsing edge cases ---');
assert(
  detectLocaleFromHeaders(new Headers({
    cookie: 'session=abc123; qrtrans_locale=en; theme=dark',
  })) === 'en',
  'Cookie qrtrans_locale=en among other cookies → en'
);

// Test 11: Invalid cookie value → fallback to Accept-Language
assert(
  detectLocaleFromHeaders(new Headers({
    cookie: 'qrtrans_locale=de',
    'accept-language': 'ar-SA,ar;q=0.9',
  })) === 'ar',
  'Invalid cookie value (de) + Accept-Language ar → ar'
);

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
