/**
 * SmarticketS — Reminder Manager Module (v1)
 *
 * Automatic reminder system for the Kiosk display.
 * Plays cyclic reminders (security, baggage, values, ticket office closure, rain, festive)
 * with P6 priority (lowest) so they never interrupt departures/arrivals.
 *
 * Rules:
 *  - P6 priority: waits for audio queue to be empty before playing
 *  - Anti-spam: minimum 2 minutes between two reminders
 *  - Silence hours: no reminders between 22h00 and 06h00 (unless urgent override)
 *  - Cyclic rotation: alternates between active reminders
 *  - Admin-controlled: enabled/disabled via WebSocket
 *
 * This is a pure library module — no React hooks, no JSX, no 'use client'.
 * All browser APIs are guarded with `typeof window !== 'undefined'.
 */

import {
  addToQueue,
  getQueueLength,
  isProcessingQueue,
  AnnouncementPriority,
} from '@/lib/audioSystem';

// ═══════════════════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════════════════

/** Reminder type identifier */
export type ReminderType = 'BAGAGES' | 'VALEURS' | 'CLOTURE_BILLETTERIE' | 'PLUIE' | 'FESTIVE';

/** Configuration for a single reminder */
export interface ReminderConfig {
  type: ReminderType;
  enabled: boolean;
  /** Interval in minutes between plays (only for BAGAGES, VALEURS) */
  intervalMinutes: number;
  /** The TTS text to announce */
  text: string;
  /** Whether this reminder has a visual banner on the Kiosk */
  hasBanner: boolean;
  /** Banner color theme (for Kiosk display) */
  bannerColor: 'yellow' | 'orange' | 'blue' | 'none';
  /** Whether this is conditional (admin-activated) */
  isConditional: boolean;
}

/** Full reminder configuration received from Admin via WebSocket */
export interface ReminderSystemConfig {
  /** Individual reminder settings */
  reminders: Record<ReminderType, ReminderConfig>;
  /** Ticket office closing time (HH:MM 24h format) */
  closingTime: string; // "20:00"
  /** Whether rain mode is active */
  isRaining: boolean;
  /** Whether holiday/festive mode is active */
  isHolidayMode: boolean;
  /** Holiday start date (optional) */
  holidayStartDate?: string; // ISO date
  /** Holiday end date (optional) */
  holidayEndDate?: string; // ISO date
}

/** Visual banner state for React components */
export interface ReminderBanner {
  type: ReminderType;
  text: string;
  color: 'yellow' | 'orange' | 'blue';
  /** When the banner was shown (timestamp) */
  shownAt: number;
  /** Duration in ms the banner should stay visible (0 = persistent until dismissed) */
  durationMs: number;
  /** Whether the banner should auto-dismiss */
  autoDismiss: boolean;
}

// ═══════════════════════════════════════════════════════════════════
//  Default Configuration
// ═══════════════════════════════════════════════════════════════════

const DEFAULT_REMINDERS: Record<ReminderType, ReminderConfig> = {
  BAGAGES: {
    type: 'BAGAGES',
    enabled: true,
    intervalMinutes: 45,
    text: "Voyageurs, n'oubliez jamais vos bagages sans surveillance. En cas d'objet trouvé, merci de le déposer immédiatement au guichet des objets trouvés.",
    hasBanner: true,
    bannerColor: 'yellow',
    isConditional: false,
  },
  VALEURS: {
    type: 'VALEURS',
    enabled: true,
    intervalMinutes: 90,
    text: "Attention à vos effets personnels : téléphones, portefeuilles et sacs. Gardez-les toujours sur vous ou en bandoulière.",
    hasBanner: false,
    bannerColor: 'none',
    isConditional: false,
  },
  CLOTURE_BILLETTERIE: {
    type: 'CLOTURE_BILLETTERIE',
    enabled: true,
    intervalMinutes: 0, // Not interval-based, triggered at closing time
    text: "Information service. La billetterie fermera ses portes dans 15 minutes. Merci de finaliser vos achats et retraits de colis avant cette heure.",
    hasBanner: true,
    bannerColor: 'orange',
    isConditional: false,
  },
  PLUIE: {
    type: 'PLUIE',
    enabled: false,
    intervalMinutes: 30,
    text: "En raison de fortes pluies, les quais peuvent être glissants. Veuillez marcher prudemment et protéger vos billets et colis de l'humidité.",
    hasBanner: true,
    bannerColor: 'blue',
    isConditional: true,
  },
  FESTIVE: {
    type: 'FESTIVE',
    enabled: false,
    intervalMinutes: 30,
    text: "La gare est très fréquentée en cette période festive. Merci de respecter les files d'attente et de faire preuve de patience lors des embarquements.",
    hasBanner: false,
    bannerColor: 'none',
    isConditional: true,
  },
};

const DEFAULT_CONFIG: ReminderSystemConfig = {
  reminders: DEFAULT_REMINDERS,
  closingTime: '20:00',
  isRaining: false,
  isHolidayMode: false,
};

// ═══════════════════════════════════════════════════════════════════
//  Internal State
// ═══════════════════════════════════════════════════════════════════

let config: ReminderSystemConfig = { ...DEFAULT_CONFIG };

/** Timestamp of the last reminder played */
let lastReminderTime = 0;

/** Current rotation index in the active reminders cycle */
let rotationIndex = 0;

/** Interval timer reference */
let checkIntervalId: ReturnType<typeof setInterval> | null = null;

/** Whether the manager is running */
let isRunning = false;

/** Closure warning already shown for this closing cycle */
let closureWarnedToday = false;

/** Closure warning shown timestamp (for banner duration) */
let closureBannerShownAt = 0;

/** Callback to notify React components of banner changes */
let bannerCallback: ((banner: ReminderBanner | null) => void) | null = null;

/** Current active banner (for React to read) */
let activeBanner: ReminderBanner | null = null;

/** Callback to notify React when a reminder starts/stops playing audio */
let playingCallback: ((playing: boolean, text?: string) => void) | null = null;

/** Minimum gap between two reminders in ms */
const MIN_REMINDER_GAP_MS = 2 * 60 * 1000; // 2 minutes

/** Check interval in ms */
const CHECK_INTERVAL_MS = 30 * 1000; // 30 seconds

/** Closure warning duration for banner */
const CLOSURE_BANNER_DURATION_MS = 2 * 60 * 1000; // 2 minutes

/** Per-reminder last played timestamps (for interval tracking) */
const lastPlayedMap: Record<ReminderType, number> = {
  BAGAGES: 0,
  VALEURS: 0,
  CLOTURE_BILLETTERIE: 0,
  PLUIE: 0,
  FESTIVE: 0,
};

// ═══════════════════════════════════════════════════════════════════
//  Browser Guard
// ═══════════════════════════════════════════════════════════════════

const isBrowser = typeof window !== 'undefined';

// ═══════════════════════════════════════════════════════════════════
//  Silence Hours Check
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if current time is within silence hours (22h00 – 06h00).
 * Returns true if reminders should NOT play.
 */
function isSilenceHours(): boolean {
  if (!isBrowser) return false;
  const now = new Date();
  const hour = now.getHours();
  // Silence between 22:00 (22) and 06:00 (6)
  return hour >= 22 || hour < 6;
}

// ═══════════════════════════════════════════════════════════════════
//  Get Active Reminders
// ═══════════════════════════════════════════════════════════════════

/**
 * Build the list of currently active (enabled) reminders that are eligible to play.
 * Filters out:
 *  - Disabled reminders
 *  - Conditional reminders that are not active (rain/holiday modes)
 *  - Closure reminder (handled separately at closing time)
 */
function getEligibleReminders(): ReminderConfig[] {
  const eligible: ReminderConfig[] = [];

  for (const reminder of Object.values(config.reminders)) {
    if (!reminder.enabled) continue;

    // Conditional reminders need their mode to be active
    if (reminder.type === 'PLUIE' && !config.isRaining) continue;
    if (reminder.type === 'FESTIVE' && !config.isHolidayMode) continue;

    // CLOTURE_BILLETTERIE is handled by its own time-based trigger
    if (reminder.type === 'CLOTURE_BILLETTERIE') continue;

    eligible.push(reminder);
  }

  return eligible;
}

// ═══════════════════════════════════════════════════════════════════
//  Closure Warning Logic
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if we should trigger the closure warning (H-15min before closing time).
 * Resets at midnight.
 */
function shouldTriggerClosureWarning(): boolean {
  if (!config.reminders.CLOTURE_BILLETTERIE.enabled) return false;

  const now = new Date();
  const [closeH, closeM] = config.closingTime.split(':').map(Number);
  const closingTimestamp = new Date();
  closingTimestamp.setHours(closeH, closeM, 0, 0);

  // 15 minutes before closing
  const warnTimestamp = closingTimestamp.getTime() - 15 * 60 * 1000;
  const nowMs = now.getTime();

  // Check if we're within the 15-minute warning window
  if (nowMs >= warnTimestamp && nowMs < closingTimestamp.getTime()) {
    // Only warn once per closing cycle
    if (!closureWarnedToday) {
      // Check if the last warning was on a different day
      const lastDate = closureBannerShownAt ? new Date(closureBannerShownAt).toDateString() : '';
      if (lastDate !== now.toDateString()) {
        return true;
      }
    }
  }

  // Reset warning flag after closing time passes (new cycle)
  if (nowMs > closingTimestamp.getTime()) {
    closureWarnedToday = false;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════
//  Check Banner Expiry
// ═══════════════════════════════════════════════════════════════════

/**
 * Check if the current banner should be dismissed.
 * Persistent banners (rain) are only dismissed when the mode is deactivated.
 */
function checkBannerExpiry(): void {
  if (!activeBanner) return;

  if (activeBanner.type === 'PLUIE') {
    // Persistent banner — dismiss when rain mode is off
    if (!config.isRaining) {
      setBanner(null);
    }
    return;
  }

  if (activeBanner.autoDismiss && activeBanner.durationMs > 0) {
    const elapsed = Date.now() - activeBanner.shownAt;
    if (elapsed >= activeBanner.durationMs) {
      setBanner(null);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Set / Clear Banner
// ═══════════════════════════════════════════════════════════════════

function setBanner(banner: ReminderBanner | null): void {
  activeBanner = banner;
  if (bannerCallback) {
    bannerCallback(banner);
  }
}

// ═══════════════════════════════════════════════════════════════════
//  Play Next Reminder (Core Logic)
// ═══════════════════════════════════════════════════════════════════

/**
 * Core function: determine and play the next eligible reminder.
 *
 * Guards (ALL must pass):
 *  1. Not in silence hours (22h–06h)
 *  2. Audio queue is empty (queue.length === 0 && !isProcessing)
 *  3. At least 2 minutes since last reminder
 *  4. At least intervalMinutes since last play of this specific reminder
 */
function playNextReminder(): void {
  // Guard 1: Silence hours
  if (isSilenceHours()) return;

  // Guard 2: Audio queue must be empty
  if (getQueueLength() > 0 || isProcessingQueue()) return;

  // Guard 3: Minimum gap since last reminder
  const nowMs = Date.now();
  if (nowMs - lastReminderTime < MIN_REMINDER_GAP_MS) return;

  // Check closure warning first (highest precedence among reminders)
  if (shouldTriggerClosureWarning()) {
    const reminder = config.reminders.CLOTURE_BILLETTERIE;
    lastReminderTime = nowMs;
    lastPlayedMap.CLOTURE_BILLETTERIE = nowMs;
    closureWarnedToday = true;
    closureBannerShownAt = nowMs;

    // Enqueue audio
    addToQueue(reminder.text, AnnouncementPriority.REMINDER, undefined, `reminder:CLOTURE:${nowMs}`);

    // Notify React that a reminder is now playing
    if (playingCallback) playingCallback(true, reminder.text);
    setTimeout(() => {
      if (playingCallback) playingCallback(false);
    }, Math.max(15000, reminder.text.length * 80 + 8000));

    // Show orange banner for 2 minutes
    setBanner({
      type: 'CLOTURE_BILLETTERIE',
      text: reminder.text,
      color: 'orange',
      shownAt: nowMs,
      durationMs: CLOSURE_BANNER_DURATION_MS,
      autoDismiss: true,
    });

    return;
  }

  // Get eligible cyclic reminders
  const eligible = getEligibleReminders();
  if (eligible.length === 0) return;

  // Find next reminder in rotation
  // Try up to eligible.length reminders to find one whose interval has elapsed
  for (let attempt = 0; attempt < eligible.length; attempt++) {
    const idx = rotationIndex % eligible.length;
    const reminder = eligible[idx];
    rotationIndex++;

    // Guard 4: Check interval since last play of this specific reminder
    const lastPlayed = lastPlayedMap[reminder.type] || 0;
    const intervalMs = reminder.intervalMinutes * 60 * 1000;
    if (nowMs - lastPlayed < intervalMs) continue;

    // Play this reminder
    lastReminderTime = nowMs;
    lastPlayedMap[reminder.type] = nowMs;

    // Enqueue audio with P6 priority
    const dedupKey = `reminder:${reminder.type}:${Math.floor(nowMs / 60000)}`;
    addToQueue(reminder.text, AnnouncementPriority.REMINDER, undefined, dedupKey);

    // Notify React that a reminder is now playing
    if (playingCallback) playingCallback(true, reminder.text);

    // Auto-dismiss playing state after estimated duration (dingdong 3s + 2×TTS ~15s + gap 5s ≈ 30s)
    const estimatedDuration = Math.max(15000, reminder.text.length * 80 + 8000);
    setTimeout(() => {
      if (playingCallback) playingCallback(false);
    }, estimatedDuration);

    // Show banner if applicable
    if (reminder.hasBanner && reminder.bannerColor !== 'none') {
      // Bagages: small yellow banner at bottom (auto-dismiss after 2 min)
      // Rain: persistent blue banner (dismissed only when mode off)
      const isPersistent = reminder.type === 'PLUIE';
      setBanner({
        type: reminder.type,
        text: reminder.text,
        color: reminder.bannerColor,
        shownAt: nowMs,
        durationMs: isPersistent ? 0 : 2 * 60 * 1000,
        autoDismiss: !isPersistent,
      });
    }

    return;
  }

  // No eligible reminder found (all within their intervals)
}

// ═══════════════════════════════════════════════════════════════════
//  Check Loop
// ═══════════════════════════════════════════════════════════════════

function checkLoop(): void {
  // Check banner expiry
  checkBannerExpiry();

  // Check if rain mode banner should be shown (persistent)
  if (config.isRaining && config.reminders.PLUIE.enabled) {
    if (!activeBanner || activeBanner.type !== 'PLUIE') {
      setBanner({
        type: 'PLUIE',
        text: config.reminders.PLUIE.text,
        color: 'blue',
        shownAt: Date.now(),
        durationMs: 0,
        autoDismiss: false,
      });
    }
  }

  // Try to play next reminder
  playNextReminder();
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Initialization
// ═══════════════════════════════════════════════════════════════════

/**
 * Initialize the ReminderManager with configuration.
 * Call this once when the Kiosk page mounts.
 *
 * @param initialConfig - Configuration from API or defaults
 */
export function initReminderManager(initialConfig?: Partial<ReminderSystemConfig>): void {
  if (initialConfig) {
    applyConfig(initialConfig);
  }
  // ReminderManager initialized
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Start / Stop
// ═══════════════════════════════════════════════════════════════════

/**
 * Start the reminder check loop.
 * Should be called after the audio system is ready.
 */
export function startReminderManager(): void {
  if (isRunning) return;
  isRunning = true;

  // Reset daily flags
  const today = new Date().toDateString();
  if (closureBannerShownAt) {
    const lastDate = new Date(closureBannerShownAt).toDateString();
    if (lastDate !== today) {
      closureWarnedToday = false;
    }
  }

  // Start check loop
  checkIntervalId = setInterval(checkLoop, CHECK_INTERVAL_MS);

  // Run immediately
  checkLoop();

  // ReminderManager started
}

/**
 * Stop the reminder manager and clean up all timers.
 */
export function stopReminderManager(): void {
  isRunning = false;
  if (checkIntervalId !== null) {
    clearInterval(checkIntervalId);
    checkIntervalId = null;
  }
  setBanner(null);
  if (playingCallback) playingCallback(false);
  // ReminderManager stopped
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Configuration Updates
// ═══════════════════════════════════════════════════════════════════

/**
 * Apply a partial configuration update (from WebSocket or API).
 * Merges with existing config.
 */
function applyConfig(update: Partial<ReminderSystemConfig>): void {
  if (update.reminders) {
    for (const [key, value] of Object.entries(update.reminders)) {
      if (value && key in config.reminders) {
        config.reminders[key as ReminderType] = {
          ...config.reminders[key as ReminderType],
          ...value,
        } as ReminderConfig;
      }
    }
  }
  if (update.closingTime !== undefined) {
    config.closingTime = update.closingTime;
  }
  if (update.isRaining !== undefined) {
    config.isRaining = update.isRaining;
  }
  if (update.isHolidayMode !== undefined) {
    config.isHolidayMode = update.isHolidayMode;
  }
  if (update.holidayStartDate !== undefined) {
    config.holidayStartDate = update.holidayStartDate;
  }
  if (update.holidayEndDate !== undefined) {
    config.holidayEndDate = update.holidayEndDate;
  }
}

/**
 * Update configuration (called from WebSocket event handler).
 * This is the main entry point for Admin-driven config changes.
 */
export function updateReminderConfig(update: Partial<ReminderSystemConfig>): void {
  applyConfig(update);
  // Reminder config updated
}

/**
 * Quick toggle for rain mode (called from WebSocket).
 */
export function setRainMode(active: boolean): void {
  config.isRaining = active;
  if (!active && activeBanner?.type === 'PLUIE') {
    setBanner(null);
  }
  // Rain mode toggled
}

/**
 * Quick toggle for holiday mode (called from WebSocket).
 */
export function setHolidayMode(active: boolean): void {
  config.isHolidayMode = active;
  // Holiday mode toggled
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — State Read
// ═══════════════════════════════════════════════════════════════════

/**
 * Get the current active visual banner (for React components).
 */
export function getActiveBanner(): ReminderBanner | null {
  return activeBanner;
}

/**
 * Get the full current configuration.
 */
export function getReminderConfig(): ReminderSystemConfig {
  return { ...config };
}

/**
 * Check if the manager is running.
 */
export function isReminderManagerRunning(): boolean {
  return isRunning;
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Banner Subscription (for React)
// ═══════════════════════════════════════════════════════════════════

/**
 * Subscribe to banner changes. The callback fires whenever a banner
 * appears or disappears. Pass null to unsubscribe.
 *
 * @param callback - Function called with the current banner (or null)
 */
export function onBannerChange(callback: ((banner: ReminderBanner | null) => void) | null): void {
  bannerCallback = callback;
  // Immediately fire with current state
  if (callback && activeBanner) {
    callback(activeBanner);
  }
}

/**
 * Subscribe to reminder playing state changes.
 * Fires `true` when a reminder starts speaking, `false` when it ends.
 * Used by the Kiosk to show a small overlay banner during reminders.
 *
 * @param callback - Function called with (isPlaying: boolean, text?: string)
 */
export function onReminderPlaying(callback: ((playing: boolean, text?: string) => void) | null): void {
  playingCallback = callback;
}

// ═══════════════════════════════════════════════════════════════════
//  Public API — Manual Play (for Admin testing)
// ═══════════════════════════════════════════════════════════════════

/**
 * Manually trigger a specific reminder (for Admin testing).
 * Bypasses interval checks but still respects silence hours.
 */
export function playReminderNow(type: ReminderType): boolean {
  const reminder = config.reminders[type];
  if (!reminder || !reminder.enabled) return false;
  if (isSilenceHours()) return false;

  const nowMs = Date.now();
  lastReminderTime = nowMs;
  lastPlayedMap[type] = nowMs;

  const dedupKey = `reminder_manual:${type}:${nowMs}`;
  addToQueue(reminder.text, AnnouncementPriority.REMINDER, undefined, dedupKey);

  return true;
}

// ═══════════════════════════════════════════════════════════════════
//  Export Default Config (for Admin UI to show defaults)
// ═══════════════════════════════════════════════════════════════════

export { DEFAULT_REMINDERS, DEFAULT_CONFIG };
