import { Mic, Check, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSpeechRecognition, evaluatePronunciation, type SpeechResult } from "@/hooks/useSpeechRecognition";

interface PronunciationRecorderProps {
  expected: string;
  pt?: string;
  threshold?: number;
  onResult?: (result: SpeechResult) => void;
  size?: "md" | "lg";
}

export function PronunciationRecorder({
  expected,
  pt,
  threshold = 0.7,
  onResult,
  size = "lg",
}: PronunciationRecorderProps) {
  const { supported, listening, transcript, interim, error, start, stop, reset } =
    useSpeechRecognition("en-US");
  const [result, setResult] = useState<SpeechResult | null>(null);

  useEffect(() => {
    if (!listening && transcript) {
      const r = evaluatePronunciation(expected, transcript, threshold);
      setResult(r);
      onResult?.(r);
    }
  }, [listening, transcript, expected, threshold, onResult]);

  const speak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(expected);
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  };

  const tryAgain = () => {
    reset();
    setResult(null);
  };

  const expectedTokens = expected.split(/\s+/);
  const expectedNorm = expected
    .toLowerCase()
    .replace(/[^a-z0-9' ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const btnSize = size === "lg" ? "size-24" : "size-20";
  const iconSize = size === "lg" ? "size-10" : "size-8";

  return (
    <div className="text-center">
      {/* Sentence with per-word coloring */}
      <div className="rounded-3xl bg-card border-2 border-border p-5 shadow-soft text-left">
        <button
          onClick={speak}
          className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3"
          aria-label="Ouvir frase"
        >
          <Volume2 className="size-5" />
        </button>
        <p className="font-display text-2xl leading-snug">
          {expectedTokens.map((tok, i) => {
            const norm = tok.toLowerCase().replace(/[^a-z0-9']/g, "");
            const idx = expectedNorm.indexOf(norm);
            const score = result?.scores[idx];
            const matched = score?.matched;
            const cls = !result
              ? ""
              : matched
                ? "text-success"
                : "text-destructive line-through decoration-2";
            return (
              <span key={i} className={`mr-1 ${cls}`}>
                {tok}
              </span>
            );
          })}
        </p>
        {pt && <p className="text-sm text-muted-foreground mt-2 italic">{pt}</p>}
      </div>

      {/* Live transcript */}
      {(listening || interim || transcript) && (
        <div className="mt-4 rounded-2xl bg-muted/50 border border-border p-3 text-sm min-h-[48px]">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">
            {listening ? "Ouvindo..." : "Você disse"}
          </p>
          <p className="font-semibold text-foreground">
            {transcript || interim || <span className="opacity-50">—</span>}
          </p>
        </div>
      )}

      {/* Score */}
      {result && (
        <div
          className={`mt-4 rounded-2xl p-4 ${
            result.passed ? "bg-success/15 border-2 border-success/30" : "bg-accent/15 border-2 border-accent/30"
          }`}
        >
          <p className="text-xs uppercase tracking-widest font-bold">
            {result.passed ? "Bem dito! 🎉" : "Quase lá!"}
          </p>
          <p className="font-display text-3xl font-bold mt-1">
            {Math.round(result.accuracy * 100)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {result.scores.filter((s) => s.matched).length} de {result.scores.length} palavras corretas
          </p>
        </div>
      )}

      {/* Error / unsupported */}
      {!supported && (
        <p className="mt-4 text-xs text-destructive font-bold">
          Seu navegador não suporta reconhecimento de voz. Use Chrome, Edge ou Safari.
        </p>
      )}
      {error && supported && (
        <p className="mt-4 text-xs text-destructive font-bold">
          {error === "not-allowed"
            ? "Permita o acesso ao microfone para praticar."
            : error === "no-speech"
              ? "Não ouvi nada. Tente novamente."
              : `Erro: ${error}`}
        </p>
      )}

      {/* Mic button */}
      <div className="mt-6">
        <button
          onClick={listening ? stop : result ? tryAgain : start}
          disabled={!supported}
          className={`${btnSize} rounded-full mx-auto flex items-center justify-center shadow-chunky active:translate-y-1 active:shadow-none disabled:opacity-40 ${
            result?.passed
              ? "bg-success text-success-foreground"
              : listening
                ? "bg-destructive text-white animate-pulse"
                : "bg-gradient-hero text-white"
          }`}
        >
          {result?.passed ? <Check className={iconSize} /> : <Mic className={iconSize} />}
        </button>
        <p className="text-xs text-muted-foreground mt-3 font-bold uppercase tracking-widest">
          {listening
            ? "Toque para parar"
            : result
              ? result.passed
                ? "Ótimo!"
                : "Tentar de novo"
              : "Toque e fale"}
        </p>
      </div>
    </div>
  );
}
