import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Heart, Zap, Trophy, Timer, RotateCcw, Home, BookOpen } from "lucide-react";

export const Route = createFileRoute("/rush")({
  head: () => ({
    meta: [
      { title: "Match Rush — Pareamento dos Salmos | Lumen" },
      { name: "description", content: "Modo arcade: pareie palavras dos Salmos em inglês e português antes do tempo acabar. Sobreviva o máximo de hordas." },
    ],
  }),
  component: RushPage,
});

// Banco de palavras dos Salmos (EN ↔ PT)
type Pair = { en: string; pt: string };

const PSALM_WORDS: Pair[] = [
  { en: "Lord", pt: "Senhor" },
  { en: "shepherd", pt: "pastor" },
  { en: "soul", pt: "alma" },
  { en: "praise", pt: "louvor" },
  { en: "mercy", pt: "misericórdia" },
  { en: "righteous", pt: "justo" },
  { en: "valley", pt: "vale" },
  { en: "rod", pt: "vara" },
  { en: "staff", pt: "cajado" },
  { en: "house", pt: "casa" },
  { en: "still waters", pt: "águas tranquilas" },
  { en: "green pastures", pt: "verdes pastos" },
  { en: "enemies", pt: "inimigos" },
  { en: "anoint", pt: "ungir" },
  { en: "cup", pt: "cálice" },
  { en: "goodness", pt: "bondade" },
  { en: "forever", pt: "para sempre" },
  { en: "rock", pt: "rocha" },
  { en: "salvation", pt: "salvação" },
  { en: "light", pt: "luz" },
  { en: "darkness", pt: "trevas" },
  { en: "heart", pt: "coração" },
  { en: "fear", pt: "temor" },
  { en: "joy", pt: "alegria" },
  { en: "song", pt: "cântico" },
  { en: "trust", pt: "confiar" },
  { en: "refuge", pt: "refúgio" },
  { en: "strength", pt: "força" },
  { en: "glory", pt: "glória" },
  { en: "blessed", pt: "bem-aventurado" },
  { en: "earth", pt: "terra" },
  { en: "heavens", pt: "céus" },
  { en: "voice", pt: "voz" },
  { en: "word", pt: "palavra" },
  { en: "lamp", pt: "lâmpada" },
  { en: "path", pt: "caminho" },
  { en: "wisdom", pt: "sabedoria" },
  { en: "love", pt: "amor" },
  { en: "faithful", pt: "fiel" },
  { en: "everlasting", pt: "eterno" },
];

const PAIRS_PER_ROUND = 4; // 4 EN + 4 PT = 8 cards
const START_LIVES = 5;
const BASE_TIME = 18; // segundos por horda
const MIN_TIME = 7;
const TIME_DECAY = 0.92;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Card = {
  id: string;
  text: string;
  lang: "en" | "pt";
  pairKey: string; // links EN to PT
  state: "idle" | "selected" | "matched" | "wrong";
};

function buildRound(round: number): { cards: Card[]; pairs: Pair[]; timeLimit: number } {
  const pairs = shuffle(PSALM_WORDS).slice(0, PAIRS_PER_ROUND);
  const cards: Card[] = [];
  pairs.forEach((p, i) => {
    const key = `${round}-${i}`;
    cards.push({ id: `${key}-en`, text: p.en, lang: "en", pairKey: key, state: "idle" });
    cards.push({ id: `${key}-pt`, text: p.pt, lang: "pt", pairKey: key, state: "idle" });
  });
  const timeLimit = Math.max(MIN_TIME, Math.round(BASE_TIME * Math.pow(TIME_DECAY, round - 1)));
  return { cards: shuffle(cards), pairs, timeLimit };
}

type Phase = "intro" | "playing" | "gameover";

function RushPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("intro");
  const [round, setRound] = useState(1);
  const [lives, setLives] = useState(START_LIVES);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [learned, setLearned] = useState<Pair[]>([]);
  const [mistakes, setMistakes] = useState<Pair[]>([]);

  const [cards, setCards] = useState<Card[]>([]);
  const [roundPairs, setRoundPairs] = useState<Pair[]>([]);
  const [timeLimit, setTimeLimit] = useState(BASE_TIME);
  const [timeLeft, setTimeLeft] = useState(BASE_TIME);
  const [selected, setSelected] = useState<Card | null>(null);
  const [flash, setFlash] = useState<"good" | "bad" | null>(null);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startGame = useCallback(() => {
    setRound(1);
    setLives(START_LIVES);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setLearned([]);
    setMistakes([]);
    const r = buildRound(1);
    setCards(r.cards);
    setRoundPairs(r.pairs);
    setTimeLimit(r.timeLimit);
    setTimeLeft(r.timeLimit);
    setSelected(null);
    setPhase("playing");
  }, []);

  const loseLife = useCallback(() => {
    setCombo(0);
    setLives((l) => {
      const next = l - 1;
      if (next <= 0) {
        setPhase("gameover");
      }
      return Math.max(0, next);
    });
    setFlash("bad");
    setTimeout(() => setFlash(null), 250);
  }, []);

  const nextRound = useCallback(() => {
    setRound((r) => {
      const next = r + 1;
      const nr = buildRound(next);
      setCards(nr.cards);
      setRoundPairs(nr.pairs);
      setTimeLimit(nr.timeLimit);
      setTimeLeft(nr.timeLimit);
      setSelected(null);
      return next;
    });
  }, []);

  // Timer
  useEffect(() => {
    if (phase !== "playing") return;
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 0.1) {
          loseLife();
          // restart same round on timeout
          return timeLimit;
        }
        return +(t - 0.1).toFixed(1);
      });
    }, 100);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [phase, timeLimit, loseLife]);

  // Check round complete
  useEffect(() => {
    if (phase !== "playing" || cards.length === 0) return;
    if (cards.every((c) => c.state === "matched")) {
      // bonus by remaining time
      const bonus = Math.round(timeLeft * 5);
      setScore((s) => s + 50 + bonus);
      setLearned((prev) => {
        const seen = new Set(prev.map((p) => p.en));
        return [...prev, ...roundPairs.filter((p) => !seen.has(p.en))];
      });
      setTimeout(nextRound, 500);
    }
  }, [cards, phase, timeLeft, roundPairs, nextRound]);

  const onPickCard = useCallback(
    (card: Card) => {
      if (phase !== "playing") return;
      if (card.state === "matched") return;
      if (selected?.id === card.id) {
        setSelected(null);
        setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, state: "idle" } : c)));
        return;
      }
      if (!selected) {
        setSelected(card);
        setCards((cs) => cs.map((c) => (c.id === card.id ? { ...c, state: "selected" } : c)));
        return;
      }
      // We have a selected card, evaluate
      if (selected.lang === card.lang) {
        // swap selection
        setCards((cs) =>
          cs.map((c) => {
            if (c.id === selected.id) return { ...c, state: "idle" };
            if (c.id === card.id) return { ...c, state: "selected" };
            return c;
          }),
        );
        setSelected(card);
        return;
      }
      const isMatch = selected.pairKey === card.pairKey;
      if (isMatch) {
        const points = 10 + Math.min(20, combo * 2);
        setScore((s) => s + points);
        setCombo((c) => {
          const nc = c + 1;
          setBestCombo((b) => Math.max(b, nc));
          return nc;
        });
        setFlash("good");
        setTimeout(() => setFlash(null), 180);
        setCards((cs) =>
          cs.map((c) => (c.id === selected.id || c.id === card.id ? { ...c, state: "matched" } : c)),
        );
        setSelected(null);
      } else {
        // Wrong
        const wrongPair = roundPairs.find((p) => p.en === selected.text || p.pt === selected.text);
        if (wrongPair) {
          setMistakes((m) => (m.find((x) => x.en === wrongPair.en) ? m : [...m, wrongPair]));
        }
        setCards((cs) =>
          cs.map((c) => (c.id === selected.id || c.id === card.id ? { ...c, state: "wrong" } : c)),
        );
        loseLife();
        setTimeout(() => {
          setCards((cs) =>
            cs.map((c) =>
              c.id === selected.id || c.id === card.id
                ? c.state === "wrong"
                  ? { ...c, state: "idle" }
                  : c
                : c,
            ),
          );
        }, 450);
        setSelected(null);
      }
    },
    [phase, selected, combo, roundPairs, loseLife],
  );

  const timePct = useMemo(() => Math.max(0, Math.min(100, (timeLeft / timeLimit) * 100)), [timeLeft, timeLimit]);

  return (
    <div
      className={`min-h-screen bg-gradient-sky pb-12 transition-colors ${
        flash === "bad" ? "bg-destructive/10" : flash === "good" ? "bg-success/10" : ""
      }`}
    >
      <header className="max-w-md mx-auto px-4 pt-5 flex items-center justify-between">
        <Link
          to="/"
          className="size-10 rounded-xl bg-card border border-border flex items-center justify-center shadow-sm"
        >
          <Home className="size-5" />
        </Link>
        <h1 className="font-display text-xl font-bold flex items-center gap-2">
          <Zap className="size-5 text-streak" /> Match Rush
        </h1>
        <div className="flex items-center gap-1">
          {Array.from({ length: START_LIVES }).map((_, i) => (
            <Heart
              key={i}
              className={`size-5 ${i < lives ? "fill-destructive text-destructive" : "text-muted-foreground/40"}`}
            />
          ))}
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-6">
        {phase === "intro" && <IntroCard onStart={startGame} />}

        {phase === "playing" && (
          <div className="space-y-4">
            {/* HUD */}
            <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span>Horda {round}</span>
                <span className="flex items-center gap-1">
                  <Timer className="size-3.5" /> {timeLeft.toFixed(1)}s
                </span>
                <span>{score} pts</span>
              </div>
              <div className="mt-2 h-2.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-100 ${
                    timePct > 50 ? "bg-success" : timePct > 25 ? "bg-streak" : "bg-destructive"
                  }`}
                  style={{ width: `${timePct}%` }}
                />
              </div>
              {combo >= 2 && (
                <p className="mt-2 text-xs font-extrabold text-streak">
                  🔥 Combo x{combo}
                </p>
              )}
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-2 gap-3">
              {cards.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onPickCard(c)}
                  disabled={c.state === "matched"}
                  className={`relative h-20 rounded-2xl border-2 px-3 font-bold text-base transition-all active:translate-y-0.5
                    ${
                      c.state === "matched"
                        ? "bg-success/15 border-success text-success opacity-60"
                        : c.state === "selected"
                        ? "bg-primary text-primary-foreground border-primary shadow-chunky"
                        : c.state === "wrong"
                        ? "bg-destructive/15 border-destructive text-destructive animate-pop-in"
                        : "bg-card border-border text-foreground hover:border-primary/50"
                    }`}
                >
                  <span
                    className={`absolute top-1.5 left-2 text-[9px] font-extrabold uppercase tracking-widest ${
                      c.lang === "en" ? "text-primary" : "text-accent"
                    } ${c.state === "selected" ? "text-primary-foreground/80" : ""}`}
                  >
                    {c.lang}
                  </span>
                  <span className="block leading-tight">{c.text}</span>
                </button>
              ))}
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Toque uma palavra em inglês e seu par em português.
            </p>
          </div>
        )}

        {phase === "gameover" && (
          <Report
            round={round}
            score={score}
            bestCombo={bestCombo}
            learned={learned}
            mistakes={mistakes}
            onRestart={startGame}
            onHome={() => navigate({ to: "/" })}
          />
        )}
      </main>
    </div>
  );
}

function IntroCard({ onStart }: { onStart: () => void }) {
  return (
    <div className="bg-card rounded-3xl p-6 shadow-soft border border-border space-y-4">
      <div className="bg-gradient-flame text-white rounded-2xl p-5 shadow-chunky">
        <p className="text-xs font-extrabold uppercase tracking-widest opacity-90">Modo Arcade</p>
        <h2 className="font-display text-3xl font-bold mt-1">Match Rush 🔥</h2>
        <p className="text-sm opacity-95 mt-2">
          Pareie palavras dos Salmos rapidinho. Cada horda fica mais rápida!
        </p>
      </div>

      <ul className="space-y-2 text-sm">
        <li className="flex gap-2">
          <span>⚡</span>
          <span>Hordas curtas com tempo decrescente</span>
        </li>
        <li className="flex gap-2">
          <span>❤️</span>
          <span>Você tem <b>5 vidas</b> — erros e tempo esgotado custam uma</span>
        </li>
        <li className="flex gap-2">
          <span>🔥</span>
          <span>Combos aumentam pontos por acerto</span>
        </li>
        <li className="flex gap-2">
          <span>📜</span>
          <span>Apenas vocabulário dos <b>Salmos</b></span>
        </li>
      </ul>

      <button
        onClick={onStart}
        className="w-full bg-gradient-hero text-white font-display text-xl font-bold py-4 rounded-2xl shadow-chunky active:translate-y-1 active:shadow-none"
      >
        Começar Rush
      </button>
    </div>
  );
}

function Report({
  round,
  score,
  bestCombo,
  learned,
  mistakes,
  onRestart,
  onHome,
}: {
  round: number;
  score: number;
  bestCombo: number;
  learned: Pair[];
  mistakes: Pair[];
  onRestart: () => void;
  onHome: () => void;
}) {
  const hordasCompletas = Math.max(0, round - 1);
  return (
    <div className="space-y-4 animate-pop-in">
      <div className="bg-gradient-gold text-white rounded-3xl p-6 shadow-chunky-gold text-center">
        <Trophy className="size-12 mx-auto" />
        <h2 className="font-display text-3xl font-bold mt-2">Game Over</h2>
        <p className="opacity-95 text-sm mt-1">Que jornada nos Salmos! 🙏</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Hordas" value={hordasCompletas} />
        <Stat label="Pontos" value={score} />
        <Stat label="Melhor combo" value={`x${bestCombo}`} />
      </div>

      <Section title={`Palavras aprendidas (${learned.length})`} icon={<BookOpen className="size-4" />}>
        {learned.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma horda concluída — tente novamente!</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {learned.map((p) => (
              <span
                key={p.en}
                className="text-xs font-semibold bg-success/15 text-success px-2.5 py-1 rounded-full border border-success/30"
              >
                {p.en} · {p.pt}
              </span>
            ))}
          </div>
        )}
      </Section>

      {mistakes.length > 0 && (
        <Section title={`Para revisar (${mistakes.length})`} icon={<RotateCcw className="size-4" />}>
          <div className="flex flex-wrap gap-2">
            {mistakes.map((p) => (
              <span
                key={p.en}
                className="text-xs font-semibold bg-destructive/10 text-destructive px-2.5 py-1 rounded-full border border-destructive/30"
              >
                {p.en} · {p.pt}
              </span>
            ))}
          </div>
        </Section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onHome}
          className="bg-card border border-border font-bold py-3 rounded-2xl shadow-sm active:translate-y-0.5"
        >
          Início
        </button>
        <button
          onClick={onRestart}
          className="bg-gradient-hero text-white font-bold py-3 rounded-2xl shadow-chunky active:translate-y-1 active:shadow-none"
        >
          Jogar de novo
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3 text-center shadow-sm">
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">{label}</p>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-display font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}
