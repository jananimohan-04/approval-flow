import type { UserSettings } from "../types";

/**
 * Voice notification service — browser SpeechSynthesis only (no paid APIs).
 * Falls back silently to visual notifications when speech is unavailable or
 * the requested language has no installed voice.
 */

export interface VoiceProvider {
  isAvailable(): boolean;
  speak(text: string, language: UserSettings["voice_language"]): void;
  cancel(): void;
}

const LANG_TAGS: Record<UserSettings["voice_language"], string> = {
  en: "en-IN",
  ta: "ta-IN",
};

class WebSpeechProvider implements VoiceProvider {
  isAvailable() {
    return typeof window !== "undefined" && "speechSynthesis" in window;
  }

  private pickVoice(langTag: string) {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.lang.toLowerCase() === langTag.toLowerCase()) ??
      voices.find((v) => v.lang.toLowerCase().startsWith(langTag.slice(0, 2))) ??
      null
    );
  }

  speak(text: string, language: UserSettings["voice_language"]) {
    if (!this.isAvailable()) return;
    try {
      const langTag = LANG_TAGS[language];
      const utterance = new SpeechSynthesisUtterance(text);
      const voice = this.pickVoice(langTag);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        // No voice for the requested language on this device — use the default
        // voice so the user still hears something, or stay silent if none.
        utterance.lang = LANG_TAGS.en;
      }
      utterance.rate = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } catch {
      /* speech failed — the visual notification is still shown */
    }
  }

  cancel() {
    if (this.isAvailable()) window.speechSynthesis.cancel();
  }
}

export const voiceService: VoiceProvider = new WebSpeechProvider();

export function hasVoiceFor(language: UserSettings["voice_language"]) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const prefix = LANG_TAGS[language].slice(0, 2).toLowerCase();
  return window.speechSynthesis
    .getVoices()
    .some((v) => v.lang.toLowerCase().startsWith(prefix));
}
