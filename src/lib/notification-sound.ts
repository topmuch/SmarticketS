/**
 * SmarticketS — Notification Sound Utility
 *
 * Plays a short 'ding' sound when a WhatsApp notification is confirmed.
 * Handles iOS audio context unlocking (requires user gesture).
 *
 * Usage:
 *   - Call notificationSound.unlock() on first user gesture (button click)
 *   - Call notificationSound.play() when status changes to 'sent'
 */

export class NotificationSound {
  private audio: HTMLAudioElement | null = null;
  private isUnlocked = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        this.audio = new Audio('/sounds/ding.mp3');
        this.audio.preload = 'auto';
        this.audio.volume = 0.3;
      } catch {
        // Audio not supported
      }
    }
  }

  /**
   * Unlock the audio context on iOS/Safari.
   * Must be called during a user gesture (click/tap).
   */
  unlock() {
    if (this.audio && !this.isUnlocked) {
      this.audio.play().catch(() => {
        // Expected: first play might fail on iOS
      });
      this.audio.pause();
      this.audio.currentTime = 0;
      this.isUnlocked = true;
    }
  }

  /**
   * Play the ding sound. No-op if not unlocked.
   */
  play() {
    if (!this.audio || !this.isUnlocked) return;
    this.audio.currentTime = 0;
    this.audio.play().catch((err) => {
      console.warn('[NotificationSound] Play failed:', err);
    });
  }
}

/** Singleton instance */
export const notificationSound = new NotificationSound();
