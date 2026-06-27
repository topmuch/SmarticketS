/**
 * SmarticketS — Audio System Module (v4)
 *
 * Complete audio system for the Signage Display kiosk, providing:
 * - Web Audio API ding-dong chime (880 Hz ding → 660 Hz dong)
 * - Priority-based announcement queue (URGENT / HIGH / NORMAL / LOW)
 * - VocalManager class — singleton, class-based API for cleaner usage
 * - P1 URGENT interrupt capability — instantly cuts current speech for security alerts
 * - Text-to-Speech (TTS) with French voice selection (fr-FR, rate 0.9)
 * - Custom audio playback (MP3 / WAV via URL) for admin-uploaded voice
 * - TTS repetition: each announcement is repeated 2× at 5s interval
 * - Anti-doublon: announcement dedup by departure ID + type per session
 * - Phase-based announcements: EMBARQUEMENT (T-10), IMMINENT (T-2), RETARD
 * - Mute / volume controls persisted to localStorage
 * - Keyboard shortcut (M) for mute toggle
 * - General message interval timer (LOW priority, never cuts urgent)
 * - Voice preloading for mobile/TV browsers
 * - Full cancel capability
 *
 * This is a pure library module — no React hooks, no JSX, no 'use client'.
 * All browser APIs are guarded with `typeof window !== 'undefined'.
 */

import { DING_DONG_DATA_URI, HAS_HARDCODED_DING_DONG } from './ding-dong-base64';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

/**
 * Priority levels for the announcement queue.
 * Higher number = higher priority.
 *
 * P1 = URGENT (10) — cuts the current speech (security alerts)
 * P2 = HIGH   (8)  — manual calls (client, driver)
 * P3 = NORMAL (5)  — automatic (boarding, delay, imminent)
 * P4 = LOW    (1)  — general messages
 * P6 = REMINDER (-1) — automatic reminders (bagages, sécurité, festive)
 */
export enum AnnouncementPriority {
  /** P6 — Automatic reminders, lowest priority, waits for queue to empty */
  REMINDER = -1,
  /** P4 — General messages, never cuts urgent announcements */
  LOW = 1,
  /** P3 — Automatic announcements: boarding, delay, imminent */
  NORMAL = 5,
  /** P2 — Manual calls: client, driver */
  HIGH = 8,
  /** P1 — URGENT: Security alerts, cuts current speech immediately */
  URGENT = 10,

  // ── Deprecated aliases (backward compatibility) ──
  /** @deprecated Use AnnouncementPriority.URGENT instead */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  CRITICAL = 10,
  /** @deprecated Use AnnouncementPriority.NORMAL instead */
  // eslint-disable-next-line @typescript-eslint/no-duplicate-enum-values
  MEDIUM = 5,
}

/** A single queued announcement item. */
export interface QueuedAnnouncement {
  id: string;
  text: string;
  priority: AnnouncementPriority;
  customAudioUrl?: string;
  /** Deduplication key — prevents same announcement from being queued twice. */
  departureKey?: string;
}

// ═══════════════════════════════════════════════════════════════════
//  Internal State
// ═══════════════════════════════════════════════════════════════════

/** Shared AudioContext instance (lazy-initialised). */
let audioCtx: AudioContext | null = null;

/** Whether voices have been loaded at least once. */
let voicesLoaded = false;

/** Whether the queue processor is currently running. */
let isProcessing = false;

/** Pending timer IDs for scheduled operations. */
const pendingTimers: ReturnType<typeof setTimeout>[] = [];

/** Pending interval IDs for general message timers. */
const pendingIntervals: ReturnType<typeof setInterval>[] = [];

/** The priority-sorted announcement queue. */
const announcementQueue: QueuedAnnouncement[] = [];

/** Counter for generating unique announcement IDs. */
let announcementCounter = 0;

/** Whether the audio system is muted. */
let _isMuted = false;

/** Current volume level (0.0 – 1.0). */
let _currentVolume = 1.0;

/**
 * Optional custom ding-dong audio URL (MP3/WAV).
 *
 * When set (via `setCustomDingDongUrl`), `playDingDong()` will play this
 * file instead of the synthesized oscillator chime (880Hz/660Hz).
 *
 * This allows each agency to upload its own ding-dong sound via the
 * "Voix & Annonces" page, and have it played before every announcement.
 *
 * Set to `null` to revert to the synthesized oscillator chime.
 */
let _customDingDongUrl: string | null = null;

/**
 * Set the custom ding-dong audio URL.
 *
 * Called by `useAgentVocalAlerts` hook when the agency config is fetched
 * from `/api/busgo/voix`. The URL is stored module-level so that
 * `playDingDong()` (which is called deep inside `speakAnnouncement`)
 * can access it without threading the URL through every function call.
 *
 * @param url - The MP3/WAV URL, or `null` to use the synthesized chime.
 */
export function setCustomDingDongUrl(url: string | null): void {
  _customDingDongUrl = url;
  if (url && typeof window !== 'undefined') {
    // Preload the audio file so it plays instantly on first call
    try {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.load();
    } catch {
      /* ignore preload errors */
    }
  }
}

/**
 * Get the current custom ding-dong URL (if any).
 */
export function getCustomDingDongUrl(): string | null {
  return _customDingDongUrl;
}

/** Whether mute/volume has been loaded from localStorage. */
let persistentStateLoaded = false;

/**
 * Cached decoded AudioBuffer for the hardcoded base64 ding-dong.
 *
 * Decoding base64 → ArrayBuffer → AudioBuffer is expensive (~10ms), so we
 * cache the result after the first call. Subsequent calls just create a new
 * BufferSource pointing to the same buffer.
 *
 * Set to `null` while decoding is in progress or if decoding failed.
 */
let _base64DingDongBuffer: AudioBuffer | null = null;

/** Whether the base64 ding-dong is currently being decoded (prevents re-entrant decode). */
let _base64DingDongDecoding = false;

/** Keyboard event handler reference (for cleanup). */
let keydownHandler: ((e: KeyboardEvent) => void) | null = null;

/** Whether an interrupt is currently in progress (prevents re-entrant interrupts). */
let isInterrupting = false;

// ═══════════════════════════════════════════════════════════════════
//  Browser Guard
// ═══════════════════════════════════════════════════════════════════

const isBrowser =
  typeof window !== 'undefined' &&
  typeof window.AudioContext !== 'undefined';

const hasSpeechSynthesis =
  typeof window !== 'undefined' &&
  typeof window.speechSynthesis !== 'undefined';

const hasLocalStorage =
  typeof window !== 'undefined' &&
  typeof window.localStorage !== 'undefined';

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
 * @param ctx      - Active AudioContext
 * @param freq     - Frequency in Hz
 * @param duration - Total duration in seconds
 * @param type     - Oscillator waveform type (sine, square, triangle, sawtooth)
 * @param startAt  - Absolute start time (ctx.currentTime offset)
 * @param volume   - Peak gain (0.0 – 1.0)
 */
function playTone(
  ctx: AudioContext,
  freq: number,
  duration: number,
  type: OscillatorType,
  startAt: number,
  volume: number = 0.6,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  // Attack envelope: 50 ms fade-in to peak
  gain.gain.setValueAtTime(0, startAt);
  gain.gain.linearRampToValueAtTime(volume, startAt + 0.05);

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
    return engineVoice;
  }

  // 4. First French voice
  const first = frenchVoices[0];
  return first;
}

// ═══════════════════════════════════════════════════════════════════
//  1. Web Audio API Ding-Dong
// ═══════════════════════════════════════════════════════════════════

/**
 * Play the ding-dong chime played before every announcement.
 *
 * 3-level priority chain:
 * 1. **Custom MP3** (agency-uploaded via "Voix & Annonces" page)
 *    — highest priority, plays the agency's own ding-dong file.
 * 2. **Hardcoded base64 chime** (built into the JS bundle)
 *    — realistic default, plays even offline, no network request.
 * 3. **Synthesized oscillator** (880Hz/660Hz via Web Audio API)
 *    — last-resort fallback if base64 decoding fails.
 *
 * Checks `isMuted` before playing — silent if muted.
 * Respects the current `currentVolume` level.
 */
export function playDingDong(): void {
  if (_isMuted) {
    return;
  }

  // ─── NIVEAU 1: MP3 uploadé par l'agence ───
  if (_customDingDongUrl) {
    playCustomAudio(_customDingDongUrl).catch(() => {
      // Si le MP3 échoue → niveau 2 (base64)
      playBase64DingDong().catch(() => {
        // Si le base64 échoue aussi → niveau 3 (oscillateur)
        playSynthesizedDingDong();
      });
    });
    return;
  }

  // ─── NIVEAU 2: base64 en dur (pas d'upload) ───
  playBase64DingDong().catch(() => {
    // Si le base64 échoue → niveau 3 (oscillateur)
    playSynthesizedDingDong();
  });
}

/**
 * Play the hardcoded base64 ding-dong chime (realistic WAV sound).
 *
 * This is the default chime played when no custom MP3 has been uploaded.
 * The base64 is inlined in the JS bundle (94 KB), so it works offline
 * with zero network requests and zero latency after the first decode.
 *
 * The decoded AudioBuffer is cached (`_base64DingDongBuffer`) so subsequent
 * calls are instant — decoding only happens once per session.
 *
 * Falls back to `playSynthesizedDingDong()` if:
 * - The browser cannot decode the audio data
 * - AudioContext is unavailable
 * - The base64 is corrupted (should never happen)
 */
async function playBase64DingDong(): Promise<void> {
  if (_isMuted) return;

  if (!isBrowser || !HAS_HARDCODED_DING_DONG) {
    playSynthesizedDingDong();
    return;
  }

  const ctx = ensureAudioContext();
  if (!ctx) {
    playSynthesizedDingDong();
    return;
  }

  try {
    // Decode the base64 data URI once, then cache the AudioBuffer
    if (!_base64DingDongBuffer && !_base64DingDongDecoding) {
      _base64DingDongDecoding = true;
      try {
        const response = await fetch(DING_DONG_DATA_URI);
        const arrayBuffer = await response.arrayBuffer();
        _base64DingDongBuffer = await ctx.decodeAudioData(arrayBuffer);
      } catch (decodeErr) {
        console.warn('[AudioSystem] Base64 ding-dong decode failed, using oscillator:', decodeErr);
        playSynthesizedDingDong();
        return;
      } finally {
        _base64DingDongDecoding = false;
      }
    }

    // If decoding is in progress (first call, race condition) → fallback oscillator
    if (!_base64DingDongBuffer) {
      playSynthesizedDingDong();
      return;
    }

    // Play the cached buffer
    const source = ctx.createBufferSource();
    source.buffer = _base64DingDongBuffer;

    // Apply current volume
    const gainNode = ctx.createGain();
    gainNode.gain.value = _currentVolume * 0.6;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);
  } catch (err) {
    console.warn('[AudioSystem] Base64 ding-dong playback failed, using oscillator:', err);
    playSynthesizedDingDong();
  }
}

/**
 * Play the synthesized oscillator ding-dong chime (880Hz → 660Hz).
 *
 * This is the last-resort fallback used when:
 * - No custom MP3 is uploaded AND
 * - The base64 chime fails to decode/play
 *
 * It generates a pure sine wave "ding-dong" using the Web Audio API,
 * mimicking a classic airport/train-station chime.
 */
function playSynthesizedDingDong(): void {
  if (_isMuted) return;

  const ctx = ensureAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const vol = _currentVolume * 0.6;

    // Ding — high A5 tone (1.5 s decay)
    playTone(ctx, 880, 1.5, 'sine', now, vol);

    // Dong — lower E5 tone (2.0 s decay), starts after 600ms
    playTone(ctx, 660, 2.0, 'sine', now + 0.6, vol);

  } catch (err) {
    console.error('[AudioSystem] Failed to play synthesized ding-dong:', err);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  2. Priority Queue System
// ═══════════════════════════════════════════════════════════════════

/**
 * Get a snapshot of the current queue (sorted by priority, highest first).
 * Returns a copy to prevent external mutation.
 */
export function getQueue(): QueuedAnnouncement[] {
  return [...announcementQueue];
}

/**
 * Get the number of items currently in the queue.
 */
export function getQueueLength(): number {
  return announcementQueue.length;
}

/**
 * Check whether the queue processor is currently active.
 */
export function isProcessingQueue(): boolean {
  return isProcessing;
}

// ═══════════════════════════════════════════════════════════════════
//  3. speakAnnouncement(text, customAudioUrl?)
// ═══════════════════════════════════════════════════════════════════

/**
 * Speak an announcement with repetition: plays ding-dong, waits 3 seconds,
 * speaks text 2× (TTS or custom audio) with 5s gap between repetitions.
 *
 * Repetition ensures the announcement covers the ambient noise in the station.
 * Anti-doublon: use `addToQueue` with `departureKey` to prevent duplicates.
 *
 * @param text           - The text to speak (used as TTS fallback or for logging).
 * @param customAudioUrl - Optional URL to an MP3/WAV file to play instead of TTS.
 * @param repeatCount    - Number of times to repeat the TTS (default 2).
 * @returns A promise that resolves when the announcement completes.
 */
export async function speakAnnouncement(
  text: string,
  customAudioUrl?: string,
  repeatCount: number = 2,
): Promise<void> {
  // 1. Play ding-dong chime
  playDingDong();

  // 2. Wait 3 seconds for chime to ring out
  await delay(3000);

  // 3. Speak TTS or play custom audio — repeated 2× with 5s gap
  for (let i = 0; i < repeatCount; i++) {
    if (_isMuted) {
      return;
    }

    if (customAudioUrl) {
      try {
        await playCustomAudio(customAudioUrl);
      } catch {
        // Fallback to TTS if custom audio fails
        console.warn('[AudioSystem] Custom audio failed, falling back to TTS');
        await speakWithRetry(text);
      }
    } else {
      await speakWithRetry(text);
    }

    // Wait 5 seconds between repetitions (only if more reps remain)
    if (i < repeatCount - 1) {
      await delay(5000);
    }
  }

}

// ═══════════════════════════════════════════════════════════════════
//  4. processQueue()
// ═══════════════════════════════════════════════════════════════════

/**
 * Process the announcement queue: takes the highest-priority item,
 * calls speakAnnouncement, then processes the next item.
 *
 * Bounded iteration (max 20 items per batch) prevents infinite loops when
 * items keep being added during speech. If new items arrive after a
 * batch completes, the next batch is scheduled automatically.
 * Re-entrant-safe: if already processing, subsequent calls are ignored.
 */
export async function processQueue(): Promise<void> {
  if (isProcessing) {
    return;
  }

  isProcessing = true;

  let iterations = 0;
  while (announcementQueue.length > 0 && iterations < 20) {
    iterations++;
    announcementQueue.sort(compareByPriority);
    const item = announcementQueue.shift()!;
    try {
      await speakAnnouncement(item.text, item.customAudioUrl);
    } catch {
      // Skip failed announcements to prevent infinite retry loops
    }
    if (announcementQueue.length > 0) await delay(500);
  }

  isProcessing = false;

  // If new items arrived after the batch limit, schedule next batch
  if (announcementQueue.length > 0) {
    void processQueue();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  5. addToQueue(text, priority, customAudioUrl?)
// ═══════════════════════════════════════════════════════════════════

/**
 * Announcement dedup set: stores departure keys already announced.
 * Key format: "departureId:type" (e.g. "abc123:boarding", "abc123:delay")
 * Reset via `clearAnnouncedSet()` or `cancelAll()`.
 */
const announcedSet = new Set<string>();

/**
 * Check if an announcement has already been made for a given departure key.
 */
export function isAlreadyAnnounced(departureKey: string): boolean {
  return announcedSet.has(departureKey);
}

/**
 * Clear the announced set (e.g. on new day or manual reset).
 */
export function clearAnnouncedSet(): void {
  announcedSet.clear();
}

/**
 * Maximum number of items allowed in the queue at once.
 * Prevents unbounded memory growth when callers add items faster than they can be spoken.
 */
const MAX_QUEUE_SIZE = 20;

/**
 * Sort comparator for announcement queue: priority descending, then FIFO by ID.
 */
function compareByPriority(a: QueuedAnnouncement, b: QueuedAnnouncement): number {
  if (b.priority !== a.priority) {
    return b.priority - a.priority;
  }
  return a.id.localeCompare(b.id);
}

/**
 * Add an announcement to the priority queue with deduplication.
 *
 * The queue is automatically sorted by priority (URGENT first).
 * If the queue processor is not already running, it is triggered.
 * If `departureKey` is provided and was already announced, the item is skipped.
 * If the queue is at max capacity (20 items), the item is silently dropped.
 *
 * **P1 URGENT interrupt**: When a URGENT (10) item is added, immediately
 * cancels any in-progress speech, plays ding-dong, waits 3s, speaks the
 * P1 message, then resumes normal queue processing.
 *
 * @param text            - The announcement text.
 * @param priority        - Priority level (default: NORMAL).
 * @param customAudioUrl  - Optional URL to play instead of TTS.
 * @param departureKey    - Optional dedup key to prevent duplicate announcements.
 * @returns The ID of the queued announcement, or empty string if deduped or queue full.
 */
export function addToQueue(
  text: string,
  priority: AnnouncementPriority = AnnouncementPriority.NORMAL,
  customAudioUrl?: string,
  departureKey?: string,
): string {
  // Safety net: reject if queue is full (prevents unbounded growth)
  if (announcementQueue.length >= MAX_QUEUE_SIZE) {
    return '';
  }

  announcementCounter++;
  const id = `ann-${Date.now()}-${announcementCounter}`;

  const item: QueuedAnnouncement = {
    id,
    text,
    priority,
    customAudioUrl,
    departureKey,
  };

  // Dedup check
  if (departureKey) {
    if (announcedSet.has(departureKey)) {
      return '';
    }
    announcedSet.add(departureKey);
  }

  announcementQueue.push(item);

  // Sort by priority
  announcementQueue.sort(compareByPriority);

  // ── P1 URGENT interrupt: immediately cut current speech ──
  if (priority >= AnnouncementPriority.URGENT) {
    // Use microtask to avoid blocking the current call stack
    void handleP1Interrupt(item);
    return id;
  }

  // Trigger processing if not already running
  if (!isProcessing) {
    // Use microtask to avoid synchronous recursion
    void processQueue();
  }

  return id;
}

// ═══════════════════════════════════════════════════════════════════
//  P1 URGENT Interrupt Handler
// ═══════════════════════════════════════════════════════════════════

/**
 * Handle a P1 URGENT interrupt:
 *  1. Cancel any in-progress speech immediately
 *  2. Wait 300ms for cancel to take effect
 *  3. Play ding-dong immediately
 *  4. Wait 3 seconds
 *  5. Speak the P1 message
 *  6. Resume queue processing
 *
 * Re-entrant-safe: if an interrupt is already in progress, the new item
 * is simply added to the queue and will be processed next.
 */
async function handleP1Interrupt(p1Item: QueuedAnnouncement): Promise<void> {
  // Prevent re-entrant interrupts
  if (isInterrupting) {
    // If queue processor isn't running, start it (the P1 item is already in queue)
    if (!isProcessing) {
      void processQueue();
    }
    return;
  }

  isInterrupting = true;

  try {
    // 1. Remove the P1 item from the queue (we'll handle it directly)
    const idx = announcementQueue.findIndex((i) => i.id === p1Item.id);
    if (idx >= 0) {
      announcementQueue.splice(idx, 1);
    }

    // 2. Cancel any in-progress speech
    if (hasSpeechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // 3. Wait 300ms for cancel to take effect
    await delay(300);

    // 4. Play ding-dong immediately
    playDingDong();

    // 5. Wait 3 seconds for chime to ring out
    await delay(3000);

    // 6. Speak the P1 message
    if (!_isMuted) {
      if (p1Item.customAudioUrl) {
        try {
          await playCustomAudio(p1Item.customAudioUrl);
        } catch {
          console.warn('[AudioSystem] P1 custom audio failed, falling back to TTS');
          await speakWithRetry(p1Item.text);
        }
      } else {
        await speakWithRetry(p1Item.text);
      }
    }

  } catch (err) {
    console.error('[AudioSystem] Error during P1 interrupt:', err);
  } finally {
    isInterrupting = false;
    // Resume queue processing if there are more items
    if (announcementQueue.length > 0 && !isProcessing) {
      void processQueue();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  6. Mute / Volume Controls
// ═══════════════════════════════════════════════════════════════════

/**
 * Load mute and volume state from localStorage.
 * Called lazily on first access.
 */
function loadPersistentState(): void {
  if (!hasLocalStorage || persistentStateLoaded) return;
  persistentStateLoaded = true;

  try {
    const muteStr = window.localStorage.getItem('smartickets_mute');
    if (muteStr !== null) {
      _isMuted = muteStr === 'true';
    }
  } catch {
    // localStorage may be restricted in some environments
  }

  try {
    const volStr = window.localStorage.getItem('smartickets_volume');
    if (volStr !== null) {
      const parsed = parseFloat(volStr);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) {
        _currentVolume = parsed;
      }
    }
  } catch {
    // Ignore
  }
}

/**
 * Save mute state to localStorage.
 */
function saveMuteState(): void {
  if (!hasLocalStorage) return;
  try {
    window.localStorage.setItem('smartickets_mute', String(_isMuted));
  } catch {
    // Ignore
  }
}

/**
 * Save volume state to localStorage.
 */
function saveVolumeState(): void {
  if (!hasLocalStorage) return;
  try {
    window.localStorage.setItem('smartickets_volume', String(_currentVolume));
  } catch {
    // Ignore
  }
}

/**
 * Get the current mute state.
 * Loads from localStorage on first access.
 */
export function getIsMuted(): boolean {
  loadPersistentState();
  return _isMuted;
}

/**
 * Get the current volume level (0.0 – 1.0).
 * Loads from localStorage on first access.
 */
export function getCurrentVolume(): number {
  loadPersistentState();
  return _currentVolume;
}

/**
 * Toggle the mute state.
 * Persists the new state to localStorage.
 */
export function toggleMute(): boolean {
  loadPersistentState();
  _isMuted = !_isMuted;
  saveMuteState();

  // If un-muted while speech is ongoing, nothing special needed
  // If muted, cancel any in-progress speech
  if (_isMuted && hasSpeechSynthesis) {
    window.speechSynthesis.cancel();
  }

  return _isMuted;
}

/**
 * Set the volume level.
 *
 * @param v - Volume level between 0.0 (silent) and 1.0 (maximum).
 * @throws Error if the value is out of range.
 */
export function setVolume(v: number): void {
  loadPersistentState();

  if (v < 0 || v > 1) {
    throw new Error(`[AudioSystem] Volume must be between 0.0 and 1.0, got ${v}`);
  }

  _currentVolume = v;
  saveVolumeState();
}

/**
 * Install the keyboard shortcut handler for 'M' key to toggle mute.
 * Call once during app initialisation. Only installs once.
 */
export function installKeyboardShortcut(): void {
  if (!isBrowser || keydownHandler !== null) return;

  keydownHandler = (e: KeyboardEvent) => {
    // Only trigger on 'M' key, not when typing in an input
    if (
      e.key === 'm' ||
      e.key === 'M'
    ) {
      // Ignore if user is typing in an input, textarea, or contentEditable
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      e.preventDefault();
      toggleMute();
    }
  };

  window.addEventListener('keydown', keydownHandler);
}

/**
 * Remove the keyboard shortcut handler.
 */
export function removeKeyboardShortcut(): void {
  if (!isBrowser || keydownHandler === null) return;

  window.removeEventListener('keydown', keydownHandler);
  keydownHandler = null;
}

// ═══════════════════════════════════════════════════════════════════
//  7. Voice Preloading
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
//  8. cancelAll()
// ═══════════════════════════════════════════════════════════════════

/**
 * Cancel everything: all timers, all intervals, all speech, clear the queue.
 *
 * This is the "emergency stop" for the audio system.
 */
export function cancelAll(): void {
  // Clear all pending timeouts
  for (const id of pendingTimers) {
    clearTimeout(id);
  }
  pendingTimers.length = 0;

  // Clear all pending intervals
  for (const id of pendingIntervals) {
    clearInterval(id);
  }
  pendingIntervals.length = 0;

  // Cancel ongoing speech
  if (hasSpeechSynthesis) {
    window!.speechSynthesis.cancel();
  }

  // Clear the announcement queue
  announcementQueue.length = 0;

  // Reset dedup set
  announcedSet.clear();

  // Reset processing state
  isProcessing = false;

  // Reset interrupt state
  isInterrupting = false;
}

// ═══════════════════════════════════════════════════════════════════
//  9. Custom Audio Support
// ═══════════════════════════════════════════════════════════════════

/**
 * Play a custom audio file from a URL (MP3, WAV, etc.).
 *
 * Respects the mute state and volume level.
 * Returns a promise that resolves when playback finishes or rejects on error.
 *
 * @param url - The URL of the audio file to play.
 * @returns A promise that resolves when playback completes.
 */
export function playCustomAudio(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isBrowser) {
      console.warn('[AudioSystem] Cannot play custom audio (not a browser)');
      resolve();
      return;
    }

    if (_isMuted) {
      resolve();
      return;
    }

    const audio = new Audio();
    audio.src = url;
    audio.volume = _currentVolume;
    audio.preload = 'auto';

    audio.onended = () => {
      resolve();
    };

    audio.onerror = (e) => {
      console.error('[AudioSystem] Custom audio error:', e);
      reject(new Error(`Failed to play custom audio: ${url}`));
    };

    audio.play().catch((err) => {
      console.error('[AudioSystem] Custom audio play() rejected:', err);
      reject(err);
    });
  });
}

// ═══════════════════════════════════════════════════════════════════
//  10. General Message Timer
// ═══════════════════════════════════════════════════════════════════

/**
 * Start a recurring general message broadcast at a specified interval.
 *
 * The message is added to the queue with `LOW` priority at the given frequency.
 * A time-sliced dedup key prevents unbounded queue growth — each repeat
 * uses a key like `general:{text}:T{minute-bucket}` so the dedup set
 * naturally expires old entries after `clearAnnouncedSet()` or `cancelAll()`.
 *
 * @param text              - The general message text to broadcast.
 * @param frequencyMinutes  - Interval between broadcasts in minutes.
 * @param customAudioUrl    - Optional custom audio URL to play instead of TTS.
 * @returns A cleanup function that stops the interval timer.
 */
export function startGeneralMessageInterval(
  text: string,
  frequencyMinutes: number,
  customAudioUrl?: string,
): () => void {
  const frequencyMs = frequencyMinutes * 60 * 1000;

  // Time-sliced dedup key: unique per broadcast cycle, preventing unbounded growth.
  // The key changes each interval tick, allowing the same message to repeat
  // at the configured frequency without flooding the queue.
  let broadcastCount = 0;
  const makeDedupKey = () => `general:${text.slice(0, 50)}:${broadcastCount}`;

  // Broadcast immediately on start
  addToQueue(text, AnnouncementPriority.LOW, customAudioUrl, makeDedupKey());
  broadcastCount++;

  // Then broadcast at interval with incrementing dedup key
  const intervalId = setInterval(() => {
    addToQueue(text, AnnouncementPriority.LOW, customAudioUrl, makeDedupKey());
    broadcastCount++;
  }, frequencyMs);

  pendingIntervals.push(intervalId);

  // Return cleanup function
  return () => {
    clearInterval(intervalId);
    const idx = pendingIntervals.indexOf(intervalId);
    if (idx >= 0) {
      pendingIntervals.splice(idx, 1);
    }
  };
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
 * Respects the current volume level.
 *
 * @param text - The text to speak (expected in French).
 * @returns A promise that resolves to `true` on success, `false` on failure.
 */
export function speakFrench(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!hasSpeechSynthesis) {
      resolve(false);
      return;
    }

    if (_isMuted) {
      resolve(false);
      return;
    }

    const voices = window!.speechSynthesis.getVoices();
    if (voices.length === 0) {
      resolve(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    // Configuration optimised for station / kiosk PA readability
    utterance.lang = 'fr-FR';
    utterance.rate = 0.9;   // Slightly slow for clarity
    utterance.pitch = 1.0;  // Neutral
    utterance.volume = _currentVolume;

    // Voice selection
    const voice = selectFrenchVoice();
    if (voice) {
      utterance.voice = voice;
    }

    // Chrome bug guard: track when speak() was called to detect
    // the Chrome bug where onend fires immediately for long text.
    const speakStartMs = Date.now();
    // Minimum expected duration: ~30ms per character (conservative estimate)
    const minDurationMs = Math.max(text.length * 30, 500);

    // Maximum timeout: 30 seconds per attempt (prevents infinite hang
    // when Chrome speechSynthesis bug causes onend to never fire).
    // After ~15s Chrome pauses speech internally and never resumes.
    const timeoutMs = Math.max(text.length * 50, 30000);
    let settled = false;

    const settle = (value: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      resolve(value);
    };

    // Safety timeout to prevent infinite hang
    const timeoutId = setTimeout(() => {
      console.warn('[AudioSystem] TTS timeout — speechSynthesis hung, forcing cancel');
      try { window!.speechSynthesis.cancel(); } catch { /* ignore */ }
      settle(false);
    }, timeoutMs);

    // Event handlers
    utterance.onstart = () => {
      // TTS started
    };

    utterance.onend = () => {
      const elapsed = Date.now() - speakStartMs;
      // If onend fires too quickly, this is the Chrome bug — reject
      if (elapsed < minDurationMs) {
        settle(false);
        return;
      }
      settle(true);
    };

    utterance.onerror = () => {
      settle(false);
    };

    try {
      window!.speechSynthesis.speak(utterance);
    } catch {
      settle(false);
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

/**
 * Simple TTS speak — speaks text once (no ding-dong, no repetition).
 * Useful for quick one-shot announcements.
 *
 * @param text           - The text to speak.
 * @param customAudioUrl - Optional URL to play instead of TTS.
 * @returns A promise that resolves when the speech completes.
 */
export async function speak(
  text: string,
  customAudioUrl?: string,
): Promise<void> {
  if (_isMuted) {
    return;
  }

  if (customAudioUrl) {
    try {
      await playCustomAudio(customAudioUrl);
    } catch {
      await speakWithRetry(text);
    }
  } else {
    await speakWithRetry(text);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Backward-Compatible Aliases (legacy API)
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

// ═══════════════════════════════════════════════════════════════════
//  Phase-Based Announcement Templates
// ═══════════════════════════════════════════════════════════════════

/**
 * Build boarding announcement text (Phase 1 — T-10 min).
 * 🟢 EMBARQUEMENT
 */
export function buildBoardingText(destination: string, time: string, platform?: string | null): string {
  const platformText = platform ? ` Quai ${platform}.` : '';
  return `Madame, Monsieur, le bus à destination de ${destination} est en cours d'embarquement.${platformText} Le bus va partir à ${time}.`;
}

/**
 * Build imminent departure announcement text (Phase 2 — T-2 min).
 * 🔴 DÉPART IMMINENT
 */
export function buildImminentText(destination: string): string {
  return `Madame, Monsieur, attention. Le bus à destination de ${destination} va partir dans deux minutes. Merci de monter à bord immédiatement.`
}

/**
 * Build delay announcement text (Phase 3 — T+5 min).
 * ⚠️ RETARD
 */
export function buildDelayText(destination: string, minutes: number): string {
  return `Madame, Monsieur, le bus en direction de ${destination} est en retard de ${minutes} minutes, merci de patienter.`
}

/**
 * Build post-delay departure announcement text.
 * 🟢 RÉSOLUTION RETARD
 */
export function buildDepartedAfterDelayText(destination: string): string {
  return `Merci de votre patience. Le bus en direction de ${destination} va partir.`
}

/**
 * Build arrival announcement text (legacy — simple).
 * 🔵 ARRIVÉE
 */
export function buildArrivalText(origin: string): string {
  return `Madame, Monsieur, le bus en provenance de ${origin} vient d'arriver à quai.`
}

// ═══════════════════════════════════════════════════════════════════
//  Arrival Phase-Based Announcement Templates
// ═══════════════════════════════════════════════════════════════════

/**
 * Build imminent arrival announcement text (H-10 min).
 * 🔵 ARRIVÉE IMMINENTE — P3 NORMAL
 * Uses "en provenance de" (NEVER "à destination de" for arrivals).
 */
export function buildArrivalIncomingText(
  origin: string,
  platform: string | null,
): string {
  const platformText = platform ? ` au quai ${platform}` : '';
  return `Le bus en provenance de ${origin} arrivera dans environ 10 minutes${platformText}. Les passagers attendant ce bus sont priés de se rapprocher de la zone d'arrivée.`;
}

/**
 * Build arrival at platform announcement text (bus has arrived — confirmed by Admin or GPS).
 * 🟢 ARRIVÉ — P2 HIGH
 * Uses "en provenance de" (NEVER "à destination de" for arrivals).
 */
export function buildArrivalArrivedText(
  origin: string,
  platform: string | null,
): string {
  const platformText = platform ? ` au quai ${platform}` : '';
  return `Le bus en provenance de ${origin} est arrivé${platformText}. Les passagers peuvent descendre. Les destinataires de colis sont invités à se présenter au guichet bagages.`;
}

/**
 * Build arrival delay announcement text (H+10min without arrival).
 * 🔴 RETARD ARRIVÉE — P2 HIGH
 * Uses "en provenance de" (NEVER "à destination de" for arrivals).
 */
export function buildArrivalDelayedText(
  origin: string,
  minutes: number,
): string {
  return `Information. Le bus en provenance de ${origin} accuse un retard estimé à ${minutes} minutes. Nous vous remercions de votre patience.`;
}

/**
 * Build cancelled arrival announcement text (Admin cancellation).
 * 🔴 ARRIVÉE ANNULÉE — P2 HIGH
 * Uses "en provenance de" (NEVER "à destination de" for arrivals).
 */
export function buildArrivalCancelledText(
  origin: string,
  time: string,
): string {
  return `Attention. Le bus en provenance de ${origin} prévu à ${time} n'arrivera pas. Les passagers sont priés de contacter le guichet pour assistance.`;
}

/**
 * Build repeated delay arrival announcement text (every 5 min repeat).
 * 🔴 RETARD ARRIVÉE (RÉPÉTITION) — P2 HIGH
 */
export function buildArrivalDelayRepeatText(
  origin: string,
): string {
  return `Information. Le bus en provenance de ${origin} est toujours en retard. Nous vous remercions de votre patience et vous tiendrons informés.`;
}

/**
 * Add a phase-based announcement with proper priority and dedup key.
 *
 * @param text            - The announcement text.
 * @param priority        - Priority level (URGENT for imminent, HIGH for delay, NORMAL for boarding).
 * @param departureKey    - Dedup key (format: "departureId:phase").
 * @param customAudioUrl  - Optional admin-uploaded voice audio URL.
 */
export function addPhaseAnnouncement(
  text: string,
  priority: AnnouncementPriority,
  departureKey: string,
  customAudioUrl?: string,
): string {
  return addToQueue(text, priority, customAudioUrl, departureKey);
}

/**
 * @deprecated Use `addToQueue()` with `AnnouncementPriority.NORMAL` instead.
 *
 * Legacy boarding announcement function for backward compatibility.
 * Builds the announcement text and adds it to the queue with a
 * dedup key based on destination + time to prevent duplicate boarding calls.
 */
export async function playBoardingAnnouncement(
  destination: string,
  time: string,
): Promise<void> {
  const text = buildAnnouncementText(destination, time);
  const departureKey = `boarding:${destination}:${time}`;
  addToQueue(text, AnnouncementPriority.NORMAL, undefined, departureKey);
}

/**
 * @deprecated Use `cancelAll()` instead.
 *
 * Legacy alias for `cancelAll()`.
 */
export const cancelAnnouncements = cancelAll;

// ═══════════════════════════════════════════════════════════════════
//  Internal Utilities
// ═══════════════════════════════════════════════════════════════════

/**
 * Simple promise-based delay.
 * Timer IDs are removed from `pendingTimers` upon resolution to prevent
 * memory leaks. The `cancelAll()` function clears any still-pending timers.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const id = setTimeout(() => {
      // Remove resolved timer to prevent unbounded memory growth
      const idx = pendingTimers.indexOf(id);
      if (idx >= 0) {
        pendingTimers.splice(idx, 1);
      }
      resolve();
    }, ms);
    pendingTimers.push(id);
  });
}

// ═══════════════════════════════════════════════════════════════════
//  VocalManager — Class-Based API (Singleton)
// ═══════════════════════════════════════════════════════════════════

/**
 * VocalManager provides a class-based API for the audio system.
 *
 * Wraps all module-level functions in a singleton instance for cleaner
 * usage in React components and other consumers. All methods delegate
 * to the module-level functions so the state is shared.
 *
 * Usage:
 * ```typescript
 * import { vocalManager, AnnouncementPriority } from '@/lib/audioSystem';
 *
 * // Enqueue an announcement
 * vocalManager.enqueue('Bus à destination de Dakar', AnnouncementPriority.NORMAL);
 *
 * // Play a ding-dong
 * vocalManager.playDingDong();
 *
 * // P1 URGENT interrupt
 * vocalManager.interruptWithPriority({
 *   id: 'urgent-1',
 *   text: 'Alerte sécurité — évacuez la zone',
 *   priority: AnnouncementPriority.URGENT,
 * });
 * ```
 */
export class VocalManager {
  private static instance: VocalManager | null = null;

  /** Private constructor — use VocalManager.getInstance() */
  private constructor() {}

  /**
   * Get the singleton VocalManager instance.
   * Creates the instance lazily on first access.
   */
  static getInstance(): VocalManager {
    if (!VocalManager.instance) {
      VocalManager.instance = new VocalManager();
    }
    return VocalManager.instance;
  }

  // ── Queue Methods ──

  /**
   * Add an announcement to the priority queue.
   *
   * @param text           - The announcement text.
   * @param priority       - Priority level (URGENT, HIGH, NORMAL, LOW).
   * @param customAudioUrl - Optional URL to play instead of TTS.
   * @param departureKey   - Optional dedup key to prevent duplicates.
   * @returns The ID of the queued announcement, or empty string if deduped.
   */
  enqueue(
    text: string,
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL,
    customAudioUrl?: string,
    departureKey?: string,
  ): string {
    return addToQueue(text, priority, customAudioUrl, departureKey);
  }

  /**
   * Process the announcement queue manually.
   * Usually called automatically — this is for explicit control.
   */
  processQueue(): Promise<void> {
    return processQueue();
  }

  // ── Playback ──

  /**
   * Play the ding-dong chime.
   */
  playDingDong(): void {
    playDingDong();
  }

  /**
   * Speak text once (no ding-dong, no repetition).
   * Useful for quick one-shot announcements.
   *
   * @param text           - The text to speak.
   * @param customAudioUrl - Optional URL to play instead of TTS.
   */
  speak(text: string, customAudioUrl?: string): Promise<void> {
    return speak(text, customAudioUrl);
  }

  // ── P1 URGENT Interrupt ──

  /**
   * Immediately cancel any in-progress speech.
   * This is the "emergency stop" for speech only (timers and queue are preserved).
   *
   * Use `interruptWithPriority()` for a full P1 interrupt sequence
   * (cancel + ding-dong + speak).
   */
  interruptCurrent(): void {
    if (hasSpeechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Execute a full P1 URGENT interrupt sequence:
   *  1. Cancel any in-progress speech
   *  2. Wait 300ms for cancel to take effect
   *  3. Play ding-dong immediately
   *  4. Wait 3 seconds
   *  5. Speak the P1 message
   *  6. Resume queue processing
   *
   * Re-entrant-safe: if an interrupt is already in progress,
   * the item is added to the queue for later processing.
   *
   * @param p1Item - The URGENT announcement to speak.
   */
  interruptWithPriority(p1Item: QueuedAnnouncement): Promise<void> {
    return handleP1Interrupt(p1Item);
  }

  // ── Controls ──

  /**
   * Toggle the mute state.
   * @returns The new mute state (true = muted).
   */
  toggleMute(): boolean {
    return toggleMute();
  }

  /**
   * Set the volume level.
   * @param v - Volume between 0.0 (silent) and 1.0 (maximum).
   */
  setVolume(v: number): void {
    setVolume(v);
  }

  /**
   * Get the current mute state.
   */
  getIsMuted(): boolean {
    return getIsMuted();
  }

  /**
   * Get the current volume level (0.0 – 1.0).
   */
  getCurrentVolume(): number {
    return getCurrentVolume();
  }

  // ── Lifecycle ──

  /**
   * Cancel everything: all timers, intervals, speech, and clear the queue.
   * This is the "emergency stop" for the entire audio system.
   */
  cancelAll(): void {
    cancelAll();
  }

  /**
   * Preload speech-synthesis voices.
   * Should be called early (e.g. on first user interaction or page mount).
   */
  preloadVoices(): void {
    preloadVoices();
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Singleton Instance Export
// ═══════════════════════════════════════════════════════════════════

/**
 * The singleton VocalManager instance.
 * Use this for the class-based API:
 *
 * ```typescript
 * import { vocalManager } from '@/lib/audioSystem';
 * vocalManager.enqueue('...', AnnouncementPriority.URGENT);
 * ```
 */
export const vocalManager: VocalManager = VocalManager.getInstance();
