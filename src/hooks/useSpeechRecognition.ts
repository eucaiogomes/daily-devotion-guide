import { useCallback, useEffect, useRef, useState } from "react";

// Minimal Web Speech API typings (not in lib.dom)
type SpeechRecognitionAlt = { transcript: string; confidence: number };
type SpeechRecognitionRes = { 0: SpeechRecognitionAlt; isFinal: boolean; length: number };
type SpeechRecognitionEvt = { results: ArrayLike<SpeechRecognitionRes>; resultIndex: number };

interface ISpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEvt) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

type SRCtor = new () => ISpeechRecognition;

function getCtor(): SRCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SRCtor;
    webkitSpeechRecognition?: SRCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export type WordScore = {
  word: string;          // expected token
  matched: boolean;      // user said it
  heard?: string;        // what was heard for this slot (best-effort)
};

export type SpeechResult = {
  transcript: string;
  scores: WordScore[];
  accuracy: number;      // 0..1
  passed: boolean;       // accuracy >= threshold
};

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function evaluatePronunciation(expected: string, heard: string, threshold = 0.7): SpeechResult {
  const expTokens = normalize(expected).split(" ").filter(Boolean);
  const heardTokens = normalize(heard).split(" ").filter(Boolean);
  const heardSet = new Map<string, number>();
  for (const t of heardTokens) heardSet.set(t, (heardSet.get(t) ?? 0) + 1);

  const scores: WordScore[] = expTokens.map((w) => {
    const remaining = heardSet.get(w) ?? 0;
    if (remaining > 0) {
      heardSet.set(w, remaining - 1);
      return { word: w, matched: true, heard: w };
    }
    return { word: w, matched: false };
  });

  const matched = scores.filter((s) => s.matched).length;
  const accuracy = expTokens.length === 0 ? 0 : matched / expTokens.length;
  return { transcript: heard, scores, accuracy, passed: accuracy >= threshold };
}

export function useSpeechRecognition(lang = "en-US") {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<ISpeechRecognition | null>(null);
  const finalRef = useRef<string>("");

  useEffect(() => {
    const Ctor = getCtor();
    setSupported(!!Ctor);
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) {
      setError("Reconhecimento de voz não suportado neste navegador.");
      return;
    }
    setError(null);
    setTranscript("");
    setInterim("");
    finalRef.current = "";

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => setListening(true);
    rec.onend = () => {
      setListening(false);
      setTranscript(finalRef.current.trim());
      setInterim("");
    };
    rec.onerror = (e) => {
      setError(e.error || "speech-error");
      setListening(false);
    };
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const text = res[0].transcript;
        if (res.isFinal) finalRef.current += " " + text;
        else interimText += text;
      }
      setInterim(interimText);
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : "start-failed");
      setListening(false);
    }
  }, [lang]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
    setInterim("");
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, reset };
}
