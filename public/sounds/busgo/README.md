# BusGo Sounds

## How to replace the notification sound

1. Replace `notification-company.mp3` with your company's custom sound
2. Replace `ding-dong.mp3` with your custom ding-dong
3. Keep the same filenames
4. Rebuild and redeploy

## Sound specifications
- Format: MP3
- Duration: 0.5–2 seconds
- Sample rate: 44100 Hz
- Channels: Mono recommended

## What each file is used for
- `notification-company.mp3` — Played with every push notification (even when screen is locked)
- `ding-dong.mp3` — Played before TTS announcements (when PWA is open)

## Notes
- The notification sound works even when the phone is locked (via NotificationOptions.sound)
- The ding-dong only plays when the PWA is open (via Web Audio API)
- TTS (text-to-speech) only works when the PWA is in the foreground
