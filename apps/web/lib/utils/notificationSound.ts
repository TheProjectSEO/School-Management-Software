/**
 * Centralized Notification Sound Utility
 * Provides consistent notification sounds across all roles
 * Uses Web Audio API to generate sounds programmatically
 */

type SoundType = "message" | "notification" | "alert";

// Audio context singleton
let audioContext: AudioContext | null = null;

/**
 * Get or create the audio context
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!audioContext) {
    try {
      audioContext = new (window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)();
    } catch {
      console.warn("Web Audio API not supported");
      return null;
    }
  }

  // Resume if suspended (required due to autoplay policies)
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  return audioContext;
}

/**
 * Generate a pleasant notification sound using Web Audio API
 */
function playWebAudioSound(
  type: SoundType,
  volume: number
): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const gainNode = ctx.createGain();
  gainNode.connect(ctx.destination);
  gainNode.gain.setValueAtTime(volume, now);

  switch (type) {
    case "message": {
      // Pleasant two-tone message sound (like a chat notification)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.type = "sine";
      osc2.type = "sine";

      osc1.frequency.setValueAtTime(880, now); // A5
      osc2.frequency.setValueAtTime(1108.73, now); // C#6

      osc1.connect(gainNode);
      osc2.connect(gainNode);

      gainNode.gain.setValueAtTime(volume * 0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.start(now);
      osc2.start(now + 0.05);
      osc1.stop(now + 0.15);
      osc2.stop(now + 0.25);
      break;
    }

    case "notification": {
      // Gentle ding-dong chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();

      osc1.type = "sine";
      osc2.type = "sine";

      osc1.frequency.setValueAtTime(659.25, now); // E5
      osc2.frequency.setValueAtTime(523.25, now); // C5

      osc1.connect(gainNode);
      osc2.connect(gainNode);

      gainNode.gain.setValueAtTime(volume * 0.25, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.start(now);
      osc2.start(now + 0.15);
      osc1.stop(now + 0.3);
      osc2.stop(now + 0.5);
      break;
    }

    case "alert": {
      // Attention-grabbing alert (ascending tones)
      const frequencies = [440, 554.37, 659.25]; // A4, C#5, E5

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const localGain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now);

        osc.connect(localGain);
        localGain.connect(ctx.destination);

        const startTime = now + i * 0.12;
        localGain.gain.setValueAtTime(0, startTime);
        localGain.gain.linearRampToValueAtTime(volume * 0.35, startTime + 0.02);
        localGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

        osc.start(startTime);
        osc.stop(startTime + 0.2);
      });
      break;
    }
  }
}

/**
 * Play a notification sound
 * @param type - The type of sound to play
 * @param volume - Optional volume override (0-1)
 */
export function playNotificationSound(
  type: SoundType = "notification",
  volume = 0.3
): void {
  if (typeof window === "undefined") return;

  const clampedVolume = Math.max(0, Math.min(1, volume));
  playWebAudioSound(type, clampedVolume);
}

/**
 * Play message notification sound - short pleasant chime
 */
export function playMessageSound(volume = 0.4): void {
  playNotificationSound("message", volume);
}

/**
 * Play general notification sound - gentle ding-dong
 */
export function playAlertSound(volume = 0.5): void {
  playNotificationSound("alert", volume);
}

/**
 * Check if audio can be played
 */
export function canPlaySound(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
}

/**
 * Initialize audio context (call after user interaction)
 * Required due to browser autoplay policies
 */
export function initializeAudio(): void {
  getAudioContext();
}

/**
 * Request notification permission for browser notifications
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
}

/**
 * Show a browser notification
 */
export function showBrowserNotification(
  title: string,
  options?: NotificationOptions
): Notification | null {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return null;
  }

  if (Notification.permission !== "granted") {
    return null;
  }

  return new Notification(title, {
    icon: "/brand/logo.png",
    badge: "/brand/logo.png",
    ...options,
  });
}
