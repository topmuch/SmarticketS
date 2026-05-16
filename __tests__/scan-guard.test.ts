/**
 * Unit test: scan-guard JSON parsing (Feature #2 — Anti-Doublon)
 *
 * Tests the JSON parsing logic used by analyzeScanSuspicion() in src/lib/groq.ts.
 * The parsing logic extracts isSuspicious, reason, and confidence from the
 * AI response and applies clamping/truncation rules.
 *
 * Run: bun run __tests__/scan-guard.test.ts
 */

import type { ScanSuspicionAnalysis } from '../src/types/ai';

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

/**
 * Replicates the JSON parsing logic from analyzeScanSuspicion() in groq.ts
 * (lines ~453-479) — this is the exact logic under test.
 */
function parseScanGuardResponse(raw: string): { analysis: ScanSuspicionAnalysis | null; analyzed: boolean } {
  // Step 1: Clean markdown backticks (same as groq.ts)
  const cleaned = raw
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();

  // Step 2: Parse JSON (same as groq.ts)
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return { analysis: null, analyzed: false };
  }

  // Step 3: Validate required fields (same as groq.ts)
  if (
    typeof parsed.isSuspicious === 'boolean' &&
    typeof parsed.confidence === 'number'
  ) {
    const analysis: ScanSuspicionAnalysis = {
      isSuspicious: parsed.isSuspicious,
      reason: String(parsed.reason || '').substring(0, 100),
      confidence: Math.min(Math.max(parsed.confidence, 0), 1),
      analyzedAt: new Date().toISOString(),
    };

    return { analysis, analyzed: true };
  }

  return { analysis: null, analyzed: false };
}

console.log('=== scan-guard.test.ts ===\n');

// --- Valid JSON: isSuspicious true ---
console.log('--- Valid JSON parsing ---');
const result1 = parseScanGuardResponse(
  JSON.stringify({ isSuspicious: true, reason: 'Duplicate scan', confidence: 0.9 })
);
assert(result1.analyzed === true, 'Valid suspicious JSON → analyzed=true');
assert(result1.analysis?.isSuspicious === true, 'isSuspicious=true parsed correctly');
assert(result1.analysis?.reason === 'Duplicate scan', 'reason parsed correctly');
assert(result1.analysis?.confidence === 0.9, 'confidence=0.9 parsed correctly');
assert(!!result1.analysis?.analyzedAt, 'analyzedAt timestamp set');

// --- Valid JSON: isSuspicious false ---
const result2 = parseScanGuardResponse(
  JSON.stringify({ isSuspicious: false, reason: 'Normal scan', confidence: 0.1 })
);
assert(result2.analyzed === true, 'Valid normal JSON → analyzed=true');
assert(result2.analysis?.isSuspicious === false, 'isSuspicious=false parsed correctly');
assert(result2.analysis?.confidence === 0.1, 'confidence=0.1 parsed correctly');

// --- Confidence clamping ---
console.log('\n--- Confidence clamping ---');
const result3 = parseScanGuardResponse(
  JSON.stringify({ isSuspicious: true, reason: 'Test', confidence: 1.5 })
);
assert(result3.analysis?.confidence === 1, 'confidence=1.5 clamped to 1');

const result4 = parseScanGuardResponse(
  JSON.stringify({ isSuspicious: true, reason: 'Test', confidence: 2.0 })
);
assert(result4.analysis?.confidence === 1, 'confidence=2.0 clamped to 1');

const result5 = parseScanGuardResponse(
  JSON.stringify({ isSuspicious: true, reason: 'Test', confidence: -0.5 })
);
assert(result5.analysis?.confidence === 0, 'confidence=-0.5 clamped to 0');

const result6 = parseScanGuardResponse(
  JSON.stringify({ isSuspicious: true, reason: 'Test', confidence: -1.0 })
);
assert(result6.analysis?.confidence === 0, 'confidence=-1.0 clamped to 0');

const result7 = parseScanGuardResponse(
  JSON.stringify({ isSuspicious: true, reason: 'Test', confidence: 0.0 })
);
assert(result7.analysis?.confidence === 0, 'confidence=0.0 unchanged');

const result8 = parseScanGuardResponse(
  JSON.stringify({ isSuspicious: true, reason: 'Test', confidence: 1.0 })
);
assert(result8.analysis?.confidence === 1, 'confidence=1.0 unchanged');

// --- Reason truncation ---
console.log('\n--- Reason truncation (max 100 chars) ---');
const longReason = 'A'.repeat(200);
const result9 = parseScanGuardResponse(
  JSON.stringify({ isSuspicious: true, reason: longReason, confidence: 0.8 })
);
assert(result9.analysis?.reason?.length === 100, `reason truncated to 100 chars (got ${result9.analysis?.reason?.length})`);

const shortReason = 'Short reason';
const result10 = parseScanGuardResponse(
  JSON.stringify({ isSuspicious: true, reason: shortReason, confidence: 0.8 })
);
assert(result10.analysis?.reason === shortReason, 'short reason unchanged');

const emptyReason = parseScanGuardResponse(
  JSON.stringify({ isSuspicious: true, reason: '', confidence: 0.8 })
);
assert(emptyReason.analysis?.reason === '', 'empty reason stays empty');

// --- Malformed JSON ---
console.log('\n--- Malformed JSON (fail-open) ---');
const result11 = parseScanGuardResponse('not json at all');
assert(result11.analyzed === false, 'Non-JSON string → analyzed=false');
assert(result11.analysis === null, 'Non-JSON string → analysis=null');

const result12 = parseScanGuardResponse('{"isSuspicious": true}');
assert(result12.analyzed === false, 'Missing confidence field → analyzed=false');

const result13 = parseScanGuardResponse('{"confidence": 0.9}');
assert(result13.analyzed === false, 'Missing isSuspicious field → analyzed=false');

const result14 = parseScanGuardResponse('{"isSuspicious": "true", "confidence": 0.9}');
assert(result14.analyzed === false, 'isSuspicious as string (not boolean) → analyzed=false');

const result15 = parseScanGuardResponse('{"isSuspicious": true, "confidence": "0.9"}');
assert(result15.analyzed === false, 'confidence as string (not number) → analyzed=false');

// --- Markdown-wrapped JSON ---
console.log('\n--- Markdown-wrapped JSON ---');
const result16 = parseScanGuardResponse(
  '```json\n{"isSuspicious": true, "reason": "Test", "confidence": 0.7}\n```'
);
assert(result16.analyzed === true, 'Markdown-wrapped JSON → analyzed=true');
assert(result16.analysis?.confidence === 0.7, 'Markdown-wrapped JSON → confidence=0.7');

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
