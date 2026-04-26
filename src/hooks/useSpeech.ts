import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useSpeech — text-to-speech wrapper around the Web Speech API (SpeechSynthesis).
 * Free, native, no API key. Works in Chrome, Edge, Safari and most modern browsers.
 *
 * Picks the best available English voice (prefers natural / Google / Samantha / en-US).
 */
export function useSpeech(defaultLang = "en-US") {
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Pick the best voice once available (voices load async in some browsers).
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }
    setSupported(true);

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      const lang = defaultLang.toLowerCase();
      const score = (v: SpeechSynthesisVoice) => {
        let s = 0;
        const vl = v.lang?.toLowerCase() ?? "";
        if (vl === lang) s += 10;
        else if (vl.startsWith(lang.split("-")[0])) s += 5;
        const name = v.name.toLowerCase();
        if (/natural|neural|premium|enhanced/.test(name)) s += 6;
        if (/google/.test(name)) s += 4;
        if (/samantha|aaron|karen|daniel/.test(name)) s += 3;
        if (v.localService) s += 1;
        return s;
      };
      const best = [...voices].sort((a, b) => score(b) - score(a))[0];
      voiceRef.current = best ?? null;
    };

    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
    return () => {
      if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null;
    };
  }, [defaultLang]);

  const speak = useCallback(
    (text: string, opts?: { rate?: number; pitch?: number; lang?: string }) => {
      if (typeof window === "undefined" || !window.speechSynthesis || !text) return;
      // Cancel anything currently playing so taps feel responsive.
      window.speechSynthesis.cancel();

      const u = new SpeechSynthesisUtterance(text);
      u.lang = opts?.lang ?? defaultLang;
      u.rate = opts?.rate ?? 0.9;
      u.pitch = opts?.pitch ?? 1;
      if (voiceRef.current) u.voice = voiceRef.current;

      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);

      window.speechSynthesis.speak(u);
    },
    [defaultLang],
  );

  const stop = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }, []);

  // Stop on unmount to avoid speech leaking across pages.
  useEffect(() => () => stop(), [stop]);

  return { supported, speaking, speak, stop };
}