import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, CheckCircle2, RotateCcw, Volume2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { useSpeech } from "@/hooks/useSpeech";
import { PSALM_BANK } from "@/data/psalmsBank";
import {
  applyGrade,
  filterDue,
  getCardState,
  getStats,
  type AnkiGrade,
  type AnkiStats,
} from "@/lib/anki";

export const Route = createFileRoute("/anki")({
  head: () => ({
    meta: [
      { title: "Anki de Versículos — Lumen" },
      {
        name: "description",
        content: "Memorize versículos em inglês com flashcards e repetição espaçada.",
      },
    ],
  }),
  component: AnkiPage,
});

interface VerseCard {
  id: string;
  ref: string;
  en: string;
  pt: string;
  psalm: number;
  title: string;
}

/** Constrói o baralho a partir dos memory verses + primeiros versículos do banco.
 *  Usa `ref` como id estável — assim o progresso persiste entre sessões. */
function buildDeck(): VerseCard[] {
  const cards: VerseCard[] = [];
  const seen = new Set<string>();
  for (const p of PSALM_BANK) {
    const push = (ref: string, en: string, pt: string) => {
      if (seen.has(ref)) return;
      seen.add(ref);
      cards.push({ id: ref, ref, en, pt, psalm: p.psalm, title: p.title });
    };
    push(p.memoryVerse.ref, p.memoryVerse.en, p.memoryVerse.pt);
    // primeiro versículo de cada salmo entra também
    const v0 = p.verses[0];
    if (v0) push(v0.ref, v0.en, v0.pt);
  }
  return cards;
}

function AnkiPage() {
  const deck = useMemo(buildDeck, []);
  const allIds = useMemo(() => deck.map((c) => c.id), [deck]);

  const [queue, setQueue] = useState<string[]>([]);
  const [stats, setStats] = useState<AnkiStats>({ total: 0, due: 0, learned: 0, newCards: 0 });
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState(0);
  const { speak, speaking } = useSpeech();

  // Inicia a sessão com os cartões devidos.
  useEffect(() => {
    const due = filterDue(allIds);
    setQueue(due);
    setStats(getStats(allIds));
  }, [allIds]);

  const currentId = queue[0];
  const current = useMemo(
    () => (currentId ? deck.find((c) => c.id === currentId) ?? null : null),
    [currentId, deck],
  );

  const grade = (g: AnkiGrade) => {
    if (!current) return;
    const state = getCardState(current.id);
    applyGrade(state, g);
    setSessionDone((n) => n + 1);
    setRevealed(false);
    // Se errou, manda para o final da fila (revisar de novo na sessão).
    if (g === "again") {
      setQueue((q) => [...q.slice(1), q[0]]);
    } else {
      setQueue((q) => q.slice(1));
    }
    setStats(getStats(allIds));
  };

  const restartSession = () => {
    setQueue(filterDue(allIds));
    setSessionDone(0);
    setRevealed(false);
    setStats(getStats(allIds));
  };

  const studyAll = () => {
    setQueue([...allIds]);
    setSessionDone(0);
    setRevealed(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-28">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          <Link
            to="/treinos"
            className="-ml-1 p-1 text-muted-foreground hover:text-foreground"
            aria-label="Voltar para treinos"
          >
            <ArrowLeft className="size-6" />
          </Link>
          <div className="flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Repetição espaçada
            </p>
            <h1 className="font-display text-lg font-bold leading-tight">Anki de Versículos</h1>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-extrabold tabular-nums text-primary">
            {sessionDone} hoje
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-6">
        <StatsBar stats={stats} />

        {current ? (
          <CardView
            card={current}
            revealed={revealed}
            onReveal={() => setRevealed(true)}
            onGrade={grade}
            speak={speak}
            speaking={speaking}
            position={sessionDone + 1}
            queueLen={queue.length + sessionDone}
          />
        ) : (
          <EmptyState
            sessionDone={sessionDone}
            stats={stats}
            onRestart={restartSession}
            onStudyAll={studyAll}
          />
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function StatsBar({ stats }: { stats: AnkiStats }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-5">
      <StatChip label="Devidos" value={stats.due} tone="bg-streak/10 text-streak" />
      <StatChip label="Novos" value={stats.newCards} tone="bg-primary/10 text-primary" />
      <StatChip label="Aprendidos" value={stats.learned} tone="bg-success/10 text-success" />
    </div>
  );
}

function StatChip({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-2xl px-3 py-2 text-center ${tone}`}>
      <p className="font-display text-xl font-bold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
    </div>
  );
}

interface CardViewProps {
  card: VerseCard;
  revealed: boolean;
  onReveal: () => void;
  onGrade: (g: AnkiGrade) => void;
  speak: (text: string, opts?: { rate?: number }) => void;
  speaking: boolean;
  position: number;
  queueLen: number;
}

function CardView({ card, revealed, onReveal, onGrade, speak, speaking, position, queueLen }: CardViewProps) {
  return (
    <div className="flex flex-1 flex-col">
      <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground tabular-nums">
        Cartão {position} de {queueLen}
      </p>

      <div className="flex flex-1 flex-col rounded-3xl border-2 border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2 text-xs">
          <BookOpen className="size-3.5 text-primary" />
          <span className="font-bold uppercase tracking-widest text-primary">{card.ref}</span>
        </div>

        {/* Frente: PT (significado) */}
        <div className="mt-5 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Significado (PT)
          </p>
          <p className="mt-1 font-display text-xl leading-snug">"{card.pt}"</p>

          {revealed && (
            <div className="mt-6 animate-pop-in border-t-2 border-dashed border-border pt-5">
              <div className="flex items-start gap-3">
                <button
                  onClick={() => speak(card.en)}
                  aria-label="Ouvir versículo"
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary active:scale-95 ${
                    speaking ? "animate-pulse" : ""
                  }`}
                >
                  <Volume2 className="size-5" />
                </button>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Versículo (EN)
                  </p>
                  <p className="mt-1 font-display text-2xl font-bold leading-snug">"{card.en}"</p>
                  <button
                    onClick={() => speak(card.en, { rate: 0.6 })}
                    className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
                  >
                    🐢 Devagar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {!revealed ? (
          <button
            onClick={onReveal}
            className="mt-6 w-full rounded-2xl bg-primary py-4 font-display text-lg font-bold text-primary-foreground shadow-chunky active:translate-y-1 active:shadow-none"
          >
            Mostrar versículo
          </button>
        ) : (
          <div className="mt-6">
            <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Como você foi?
            </p>
            <div className="grid grid-cols-4 gap-2">
              <GradeBtn label="Errei" sub="<1m" tone="bg-destructive text-destructive-foreground" onClick={() => onGrade("again")} />
              <GradeBtn label="Difícil" sub="≈1d" tone="bg-streak text-primary-foreground" onClick={() => onGrade("hard")} />
              <GradeBtn label="Bom" sub="3d+" tone="bg-success text-success-foreground" onClick={() => onGrade("good")} />
              <GradeBtn label="Fácil" sub="7d+" tone="bg-gradient-gold text-primary-foreground" onClick={() => onGrade("easy")} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function GradeBtn({
  label,
  sub,
  tone,
  onClick,
}: {
  label: string;
  sub: string;
  tone: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl py-2.5 font-extrabold shadow-sm active:translate-y-0.5 ${tone}`}
    >
      <span className="block text-sm leading-tight">{label}</span>
      <span className="block text-[10px] font-bold opacity-80 leading-tight tabular-nums">{sub}</span>
    </button>
  );
}

function EmptyState({
  sessionDone,
  stats,
  onRestart,
  onStudyAll,
}: {
  sessionDone: number;
  stats: AnkiStats;
  onRestart: () => void;
  onStudyAll: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-success/10 text-success">
        <CheckCircle2 className="size-10" />
      </div>
      <h2 className="mt-4 font-display text-2xl font-bold">
        {sessionDone > 0 ? "Sessão concluída!" : "Nada para revisar agora"}
      </h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">
        {sessionDone > 0
          ? `Você revisou ${sessionDone} cartões. Volte amanhã para os próximos versículos.`
          : "Todos seus versículos estão em dia. Você pode estudar todo o baralho mesmo assim."}
      </p>

      <div className="mt-6 grid w-full max-w-xs gap-2">
        <button
          onClick={onStudyAll}
          className="rounded-2xl bg-primary py-3 font-extrabold text-primary-foreground shadow-chunky active:translate-y-1 active:shadow-none"
        >
          Estudar todos ({stats.total})
        </button>
        {sessionDone > 0 && (
          <button
            onClick={onRestart}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-border bg-card py-3 font-extrabold text-foreground"
          >
            <RotateCcw className="size-4" />
            Recarregar devidos
          </button>
        )}
      </div>
    </div>
  );
}
