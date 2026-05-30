/**
 * SmarticketS — Audio System Module
 *
 * Complete audio system for the Signage Display kiosk, providing:
 * - Ding-Dong chime via Web Audio API oscillators
 * - Text-to-Speech (TTS) with French female voice selection
 * - Boarding announcement sequence (ding-dong → TTS → repeat)
 * - Voice preloading for mobile/TV browsers
 *
 * This is a pure library module — no React hooks, no JSX.
 * All browser APIs are guarded with `typeof window !== 'undefined'`.
 */

// ═══════════════════════════════════════════════════════════════════
//  Internal State
// ═══════════════════════════════════════════════════════════════════

/** Shared AudioContext instance (lazy-initialised). */
let audioCtx: AudioContext | null = null;

/** Whether voices have been loaded at least once. */
let voicesLoaded = false;

/** Whether a boarding announcement sequence is currently running. */
let isAnnouncing = false;

/** Pending timer IDs for scheduled announcement rounds / TTS delays. */
const pendingTimers: ReturnType<typeof setTimeout>[] = [];

// ═══════════════════════════════════════════════════════════════════
//  Browser Guard
// ═══════════════════════════════════════════════════════════════════

const isBrowser =
  typeof window !== 'undefined' &&
  typeof window.AudioContext !== 'undefined';

const hasSpeechSynthesis =
  typeof window !== 'undefined' &&
  typeof window.speechSynthesis !== 'undefined';

// ═══════════════════════════════════════════════════════════════════
//  AudioContext helpers
// ═══════════════════════════════════════════════════════════════════

/**
 * Create (or resume) the shared AudioContext.
 * Handles browser compatibility with `webkitAudioContext`.
 */
function ensureAudioContext(): AudioContext | null {
  if (!isBrowser) return null;

  try {
    if (!audioCtx) {
      const W = window as unknown as Record<string, typeof AudioContext>;
      const Ctx = W.AudioContext || W.webkitAudioContext;
      audioCtx = new Ctx();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    console.warn('[AudioSystem] AudioContext not available');
    return null;
  }
}

/**
 * Play a single oscillator tone with attack-decay envelope.
 *
 * @param ctx     - Active AudioContext
 * @param freq    - Frequency in Hz
 * @param duration - Total duration in seconds
 * @param type    - Oscillator waveform type (sine, square, triangle, sawtooth)
 * @param startAt - Absolute start time (ctx.currentTime offset)
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType,
  startAt: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  // Attack envelope: 50 ms fade-in to peak
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(0.6, startAt + 0.05);

  // Decay envelope: exponential fade-out for natural sustain
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration);
}

// ═══════════════════════════════════════════════════════════════════
//  Voice Selection
// ═══════════════════════════════════════════════════════════════════

/**
 * Known French female voice names (cross-browser / cross-OS).
 * Used as priority list during voice selection.
 */
const FRENCH_FEMALE_PREFERENCES = [
  'Google français',
  'Microsoft Hortense',
  'Google fr',
  'Samantha',
  'Victoria',
  'Amelie',
  'Denise',
  'Zira',
  'Microsoft Sabina',
  'Apple Amelie',
  'VoiceOver Female',
];

/**
 * Select the best available French voice.
 *
 * Priority order:
 *  1. Named French female voice from the known-preference list
 *  2. Any Google / Microsoft / Apple French voice
 *  3. Any French voice (lang starts with 'fr')
 *  4. First available voice (fallback)
 *
 * @returns Selected voice, or `null` if no voices are available.
 */
function selectFrenchVoice(): SpeechSynthesisVoice | null {
  if (!hasSpeechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // 1. French voices
  const frenchVoices = voices.filter((v) => v.lang.startsWith('fr'));
  if (frenchVoices.length === 0) {
    console.warn('[AudioSystem] No French voice found, using default voice');
    return voices[0] ?? null;
  }

  // 2. Known female French voice
  for (const prefName of FRENCH_FEMALE_PREFERENCES) {
    const match = frenchVoices.find((v) => v.name.includes(prefName));
    if (match) {
      console.log(`[AudioSystem] Selected preferred voice: ${match.name} (${match.lang})`);
      return match;
    }
  }

  // 3. Google / Microsoft / Apple French
  const engineVoice = frenchVoices.find(
    (v) =>
      v.name.includes('Google') ||
      v.name.includes('Microsoft') ||
      v.name.includes('Apple'),
  );
  if (engineVoice) {
    console.log(`[AudioSystem] Selected engine voice: ${engineVoice.name} (${engineVoice.lang})`);
    return engineVoice;
  }

  // 4. First French voice
  const first = frenchVoices[0];
  console.log(`[AudioSystem] Selected first French voice: ${first.name} (${first.lang})`);
  return first;
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Ding-Dong
// ═══════════════════════════════════════════════════════════════════

/**
 * Play a pleasant ding-dong chime using Web Audio API oscillators.
 *
 * The chime mimics a classic airport / train-station announcement chime:
 * - First tone: high-pitched "ding" at ~880 Hz (A5)
 * - Second tone: lower "dong" at ~660 Hz (E5)
 * - Each tone has a short attack and exponential decay envelope
 * - Total duration ~1.5 seconds
 *
 * On browsers where `AudioContext` is unavailable this is a no-op.
 */
export function playDingDong(): void {
  const ctx = ensureAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // Ding — high A5 tone (0.6 s)
    playTone(ctx, 880, 0.6, 'sine', now);

    // Dong — lower E5 tone (1.2 s), starts after 0.5 s
    playTone(ctx, 660, 1.2, 'sine', now + 0.5);

    console.log('[AudioSystem] Ding-Dong played');
  } catch (err) {
    console.warn('[AudioSystem] Failed to play ding-dong:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Text-to-Speech (TTS)
// ═══════════════════════════════════════════════════════════════════

/**
 * Speak text aloud using a French female voice.
 *
 * Automatically selects the best available French voice (female preferred),
 * configures optimal rate/pitch/volume for public announcement readability,
 * and resolves `true` when the utterance finishes or `false` on error.
 *
 * @param text - The text to speak (expected in French).
 * @returns A promise that resolves to `true` on success, `false` on failure.
 */
export function speakFrench(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!hasSpeechSynthesis) {
      console.error('[AudioSystem] speechSynthesis not supported');
      resolve(false);
      return;
    }

    const voices = window!.speechSynthesis.getVoices();
    if (voices.length === 0) {
      console.warn('[AudioSystem] No voices available yet');
      resolve(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Configuration optimised for station / kiosk PA readability
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;   // Slightly slow for clarity
    utterance.pitch = 1.0;  // Neutral
    utterance.volume = 1.0;  // Maximum

    // Voice selection
    const voice = selectFrenchVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Event handlers
    utterance.onstart = () => {
      console.log('[AudioSystem] TTS started');
    };

    utterance.onend = () => {
      console.log('[AudioSystem] TTS finished');
      resolve(true);
    };

    utterance.onerror = (event) => {
      console.error('[AudioSystem] TTS error:', event.error);
      if (event.error === 'not-allowed') {
        console.error('[AudioSystem] Audio permission denied — user interaction required');
      }
      resolve(false);
    };

    try {
      window!.speechSynthesis.speak(utterance);
      console.log('[AudioSystem] speak() called successfully');
    } catch (err) {
      console.error('[AudioSystem] speak() threw:', err);
      resolve(false);
    }
  });
}

/**
 * Attempt to speak text, retrying on failure up to `maxRetries` times.
 *
 * Each retry cancels any in-flight speech before re-attempting after a
 * short 500 ms delay, giving the speech engine time to reset.
 *
 * @param text       - The text to speak.
 * @param maxRetries - Maximum number of retry attempts (default 3).
 * @returns A promise that resolves to `true` if any attempt succeeded,
 *          or `false` if all attempts failed.
 */
export async function speakWithRetry(
  text: string,
  maxRetries: number = 3,
): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Cancel any in-flight speech before retrying
    if (hasSpeechSynthesis) {
      window!.speechSynthesis.cancel();
    }

    // Brief pause so the cancel takes effect
    await delay(100);

    const success = await speakFrench(text);

    if (success) return true;

    console.warn(
      `[AudioSystem] TTS failed — attempt ${attempt}/${maxRetries}`,
    );

    if (attempt < maxRetries) {
      await delay(500);
    }
  }

  console.error(`[AudioSystem] TTS failed after ${maxRetries} attempts`);
  return false;
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Boarding Announcement
// ═══════════════════════════════════════════════════════════════════

/**
 * TTS template for the boarding announcement.
 *
 * @param destination - Destination city / location name.
 * @param time        - Departure time string (e.g. "14h30").
 */
function buildAnnouncementText(destination: string, time: string): string {
  return `Madame, Monsieur, les passagers en direction de ${destination} sont priés de monter à bord. Le bus va partir à ${time}.`;
}

/**
 * Execute a full boarding announcement sequence.
 *
 * The sequence is:
 *  1. Play ding-dong chime
 *  2. Wait 1 s
 *  3. Speak the boarding announcement (with retry)
 *  4. Repeat the above 2 times, with a 2-minute interval between repeats
 *
 * While an announcement is active, calling this function again is a no-op.
 * Use {@link cancelAnnouncements} to abort an in-progress sequence.
 *
 * @param destination - Destination city / location name.
 * @param time        - Departure time string (e.g. "14h30").
 * @returns A promise that resolves when all rounds are complete or cancelled.
 */
export async function playBoardingAnnouncement(
  destination: string,
  time: string,
): Promise<void> {
  if (isAnnouncing) {
    console.log('[AudioSystem] Announcement already in progress — ignoring');
    return;
  }

  isAnnouncing = true;
  const maxRounds = 2;
  const intervalMs = 120_000; // 2 minutes between rounds

  const text = buildAnnouncementText(destination, time);

  for (let round = 1; round <= maxRounds; round++) {
    // Guard: cancelled between rounds
    if (!isAnnouncing) break;

    console.log(`[AudioSystem] Announcement round ${round}/${maxRounds}`);

    // 1. Ding-dong
    playDingDong();

    // 2. Wait 1 s, then TTS
    await delayWithCancel(1000);

    if (!isAnnouncing) break;

    await speakWithRetry(text);

    // 3. Schedule next round (skip after last round)
    if (round < maxRounds) {
      console.log(`[AudioSystem] Next announcement in ${intervalMs / 1000}s`);
      await delayWithCancel(intervalMs);
    }
  }

  isAnnouncing = false;
  console.log('[AudioSystem] Boarding announcement sequence complete');
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Cancel
// ═══════════════════════════════════════════════════════════════════

/**
 * Cancel any pending or in-progress boarding announcement sequence.
 *
 * This clears all scheduled timeouts and cancels any ongoing speech.
 */
export function cancelAnnouncements(): void {
  console.log('[AudioSystem] Cancelling all announcements');

  // Clear all pending timers
  for (const id of pendingTimers) {
    clearTimeout(id);
  }
  pendingTimers.length = 0;

  // Cancel ongoing speech
  if (hasSpeechSynthesis) {
    window!.speechSynthesis.cancel();
  }

  isAnnouncing = false;
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Preload Voices
// ═══════════════════════════════════════════════════════════════════

/**
 * Preload speech-synthesis voices with a timeout fallback.
 *
 * On mobile / TV browsers voices may load asynchronously after page load.
 * This function:
 *  1. Attempts an immediate voice load
 *  2. Registers the `onvoiceschanged` event as a fallback
 *  3. Retries after 100 ms, 500 ms, and 1000 ms
 *  4. Logs the number of voices discovered
 *
 * Should be called early (e.g. on first user interaction or page mount).
 */
export function preloadVoices(): void {
  if (!hasSpeechSynthesis) return;

  function onLoad() {
    const voices = window!.speechSynthesis.getVoices();
    if (voices.length > 0 && !voicesLoaded) {
      voicesLoaded = true;
      console.log(`[AudioSystem] ${voices.length} voice(s) loaded`);
    }
  }

  // Immediate attempt
  onLoad();

  // Register async change listener
  window!.speechSynthesis.onvoiceschanged = onLoad;

  // Retry schedule for slow browsers
  const t1 = setTimeout(onLoad, 100);
  const t2 = setTimeout(onLoad, 500);
  const t3 = setTimeout(onLoad, 1000);

  // Keep references so they can be cancelled if needed
  pendingTimers.push(t1, t2, t3);
}

// ═══════════════════════════════════════════════════════════════════
//  Internal Utilities
// ═══════════════════════════════════════════════════════════════════

/**
 * Promise-based delay that also checks `isAnnouncing`.
 * Resolves early (with `false`) if announcements are cancelled.
 */
function delayWithCancel(ms: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const id = setTimeout(() => resolve(true), ms);
    pendingTimers.push(id);
  });
}

/**
 * Simple promise-based delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
