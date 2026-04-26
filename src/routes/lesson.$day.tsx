import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ArrowLeft, Volume2, Check, Sparkles, HandHeart, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PronunciationRecorder } from "@/components/PronunciationRecorder";
import { useSpeech } from "@/hooks/useSpeech";
import { getPsalmByDay, type PsalmLesson } from "@/data/psalms";

export const Route = createFileRoute("/lesson/$day")({
  head: () => ({
    meta: [
      { title: "Devocional do dia — Lumen" },
      { name: "description", content: "Um momento íntimo com Deus para aprender inglês através dos Salmos." },
    ],
  }),
  component: LessonPage,
});

type Step =
  | { kind: "prayer"; psalm: PsalmLesson; lines: GuidedPrayerLine[]; focus: string }
  | { kind: "translate"; en: string; pt: string; words: string[] }
  | { kind: "choice"; prompt: string; options: { text: string; correct: boolean }[] }
  | { kind: "fill"; sentence: string[]; blank: number; options: string[]; answer: string }
  | { kind: "listen"; en: string; expected: string; words: string[] }
  | { kind: "flash"; en: string; pt: string; example: string; ipa?: string }
  | { kind: "intro"; psalm: PsalmLesson }
  | { kind: "match"; pairs: { en: string; pt: string }[] }
  | { kind: "order"; reference: string; lines: string[] }
  | { kind: "speak"; en: string; pt: string };

/** Generates a structured Psalm lesson:
 *  prayer → intro → flashcards (vocab) → match → translate → listen → fill → order → speak (memory verse).
 */
function buildPsalmSteps(psalm: PsalmLesson): Step[] {
  const steps: Step[] = [
    {
      kind: "prayer",
      psalm,
      focus: psalm.theme,
      lines: buildGuidedPrayer(psalm),
    },
    { kind: "intro", psalm },
  ];

  for (const w of psalm.keywords.slice(0, 2)) {
    steps.push({
      kind: "flash",
      en: w.en,
      pt: w.pt,
      ipa: w.ipa,
      example: w.example ?? `${w.en}.`,
    });
  }

  steps.push({
    kind: "match",
    pairs: psalm.keywords.slice(0, 5).map((k) => ({ en: capitalize(k.en), pt: capitalize(k.pt) })),
  });

  const v1 = psalm.verses[0];
  const distractors = psalm.keywords.map((k) => capitalize(k.en)).slice(0, 3);
  steps.push({
    kind: "translate",
    en: v1.en,
    pt: v1.pt,
    words: shuffle([...v1.en.split(/\s+/), ...distractors]),
  });

  const vListen = psalm.verses[1] ?? v1;
  const listenWords = vListen.en.split(/\s+/);
  steps.push({
    kind: "listen",
    en: vListen.en,
    expected: vListen.en,
    words: shuffle([...listenWords, ...distractors.slice(0, 2)]),
  });

  const fillVerse = psalm.verses.find((v) => v.vocab && Object.keys(v.vocab).length > 0) ?? v1;
  const blankWord = Object.keys(fillVerse.vocab ?? {})[0];
  if (blankWord) {
    const tokens = fillVerse.en.split(/\s+/);
    const blankIdx = tokens.findIndex((t) => t.replace(/[^a-zA-Z]/g, "").toLowerCase() === blankWord.toLowerCase());
    if (blankIdx >= 0) {
      const before = tokens.slice(0, blankIdx).join(" ");
      const after = tokens.slice(blankIdx + 1).join(" ");
      const otherKeys = psalm.keywords.map((k) => k.en).filter((w) => w.toLowerCase() !== blankWord.toLowerCase());
      steps.push({
        kind: "fill",
        sentence: [before, "___", after],
        blank: 1,
        options: shuffle([blankWord, ...otherKeys.slice(0, 2)]),
        answer: blankWord,
      });
    }
  }

  const mv = psalm.memoryVerse;
  steps.push({
    kind: "choice",
    prompt: `O que o teu coração entende quando ora "${mv.en}"?`,
    options: shuffle([
      { text: mv.pt, correct: true },
      ...psalm.verses.filter((v) => v.pt !== mv.pt).slice(0, 2).map((v) => ({ text: v.pt, correct: false })),
    ]),
  });

  if (psalm.verses.length >= 3) {
    steps.push({
      kind: "order",
      reference: `${psalm.title} (excerpt)`,
      lines: psalm.verses.slice(0, 4).map((v) => v.en),
    });
  }

  steps.push({ kind: "speak", en: mv.en, pt: mv.pt });

  return steps;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

type GuidedPrayerLine = { en: string; pt: string; highlight?: string };

/**
 * Orações guiadas no tom de um adorador íntimo — coração diante de Deus.
 * Sem linguagem corporativa ("we ask", "help us learn"). Tudo em primeira pessoa,
 * voltado para a presença, não para a performance.
 */
const GUIDED_PRAYERS: GuidedPrayerLine[][] = [
  [
    { en: "Here I am, Lord. My heart is open before You.", pt: "Aqui estou, Senhor. Meu coração está aberto diante de Ti.", highlight: "heart" },
    { en: "Quiet my mind. Let me hear Your voice in this Word.", pt: "Aquieta a minha mente. Deixa-me ouvir a Tua voz nesta Palavra.", highlight: "voice" },
    { en: "Speak, for Your servant is listening.", pt: "Fala, que o Teu servo escuta.", highlight: "Speak" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Lord, I come to You as I am — tired, hungry, hopeful.", pt: "Senhor, venho a Ti como estou — cansado, faminto, esperançoso.", highlight: "come" },
    { en: "Sit with me. Teach me the language of Your praise.", pt: "Senta-Te comigo. Ensina-me a língua do Teu louvor.", highlight: "praise" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Father, I lift my eyes to You this morning.", pt: "Pai, levanto os meus olhos a Ti nesta manhã.", highlight: "eyes" },
    { en: "Tune my heart to sing Your grace, even in another tongue.", pt: "Afina meu coração para cantar a Tua graça, ainda que em outra língua.", highlight: "grace" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Lord, I'm thirsty for You.", pt: "Senhor, tenho sede de Ti.", highlight: "thirsty" },
    { en: "Pour Yourself into every word I read today.", pt: "Derrama-Te em cada palavra que eu ler hoje.", highlight: "Pour" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "My God, hide me in Your shadow while I learn.", pt: "Meu Deus, esconde-me à Tua sombra enquanto aprendo.", highlight: "shadow" },
    { en: "Make this time holy. Make my heart soft.", pt: "Faze deste tempo um tempo santo. Faze meu coração macio.", highlight: "holy" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Lord, I lay down my hurry at Your feet.", pt: "Senhor, deponho aos Teus pés a minha pressa.", highlight: "feet" },
    { en: "Slow me down. Let me taste each word like honey.", pt: "Acalma-me. Deixa-me provar cada palavra como mel.", highlight: "honey" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Father, You are my song before You are my study.", pt: "Pai, Tu és minha canção antes de seres meu estudo.", highlight: "song" },
    { en: "Be honored in this small offering of attention.", pt: "Sê honrado nesta pequena oferta de atenção.", highlight: "offering" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Lord, I bless You with the language I have, and the one I'm learning.", pt: "Senhor, eu Te bendigo com a língua que tenho e com a que estou aprendendo.", highlight: "bless" },
    { en: "May every new word become a stone in the altar of my praise.", pt: "Que cada nova palavra se torne uma pedra no altar do meu louvor.", highlight: "altar" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "My soul, bless the Lord — wherever you are, in whatever tongue.", pt: "Bendize, ó minha alma, ao Senhor — onde quer que estejas, em qualquer língua.", highlight: "soul" },
    { en: "I want to know You more, even one word at a time.", pt: "Quero conhecer-Te mais, ainda que palavra por palavra.", highlight: "know" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Lord, You are near. I can feel it.", pt: "Senhor, Tu estás perto. Eu sinto.", highlight: "near" },
    { en: "Walk through this Psalm with me, like a friend on the road.", pt: "Caminha por este Salmo comigo, como um amigo no caminho.", highlight: "Walk" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Father, my heart wanders. Pull it back gently.", pt: "Pai, meu coração se distrai. Traze-o de volta com ternura.", highlight: "wanders" },
    { en: "Anchor me in Your Word for these next minutes.", pt: "Ancora-me na Tua Palavra nestes próximos minutos.", highlight: "Anchor" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Lord, You sing over me. Teach me to sing back.", pt: "Senhor, Tu cantas sobre mim. Ensina-me a cantar de volta.", highlight: "sing" },
    { en: "I open my mouth — fill it with Your praise.", pt: "Eu abro a minha boca — enche-a do Teu louvor.", highlight: "mouth" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "My God, I don't come to perform. I come to be loved.", pt: "Meu Deus, não venho para desempenhar. Venho para ser amado.", highlight: "loved" },
    { en: "Let this Psalm hold me before I try to hold it.", pt: "Deixa este Salmo me sustentar antes que eu tente sustentá-lo.", highlight: "hold" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Lord, You are my portion. Nothing else compares.", pt: "Senhor, Tu és a minha porção. Nada se compara.", highlight: "portion" },
    { en: "I cherish this quiet moment with You.", pt: "Eu guardo como tesouro este momento de silêncio contigo.", highlight: "cherish" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Father, write Your Word on the walls of my heart today.", pt: "Pai, escreve a Tua Palavra nas paredes do meu coração hoje.", highlight: "write" },
    { en: "Let me carry it long after this lesson ends.", pt: "Deixa-me carregá-la muito depois deste momento terminar.", highlight: "carry" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
];

function buildGuidedPrayer(psalm: PsalmLesson): GuidedPrayerLine[] {
  return GUIDED_PRAYERS[(psalm.day - 1) % GUIDED_PRAYERS.length];
}

function LessonPage() {
  const { day } = Route.useParams();
  const psalm = useMemo(() => getPsalmByDay(parseInt(day, 10) || 1), [day]);
  const STEPS = useMemo(() => buildPsalmSteps(psalm), [psalm]);
  const [idx, setIdx] = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "right" | "wrong">("idle");
  const total = STEPS.length;
  const step = STEPS[idx];

  const next = () => {
    setFeedback("idle");
    if (idx + 1 >= total) setIdx(total); else setIdx(idx + 1);
  };

  if (idx >= total) {
    return <LessonComplete day={day} psalm={psalm} />;
  }

  const stepNumber = idx + 1;
  const currentProgress = (stepNumber / total) * 100;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Cabeçalho enxuto: apenas voltar + barra fina. Sem badges, sem rótulos, sem contador. */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-1 -ml-1 text-muted-foreground hover:text-foreground" aria-label="Voltar para início">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex-1">
            <div
              className="h-1.5 bg-muted rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={stepNumber}
              aria-valuemin={1}
              aria-valuemax={total}
              aria-label={`Avanço do devocional`}
            >
              <div
                className="h-full bg-gradient-gold transition-all duration-700 ease-out"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-4 flex flex-col">
        <div key={idx} className="animate-pop-in flex-1">
          {step.kind === "prayer" && <PrayerStep step={step} onComplete={next} />}
          {step.kind === "intro" && <IntroStep psalm={step.psalm} />}
          {step.kind === "flash" && <FlashCard step={step} />}
          {step.kind === "translate" && <TranslateExercise step={step} feedback={feedback} setFeedback={setFeedback} />}
          {step.kind === "choice" && <ChoiceExercise step={step} feedback={feedback} setFeedback={setFeedback} />}
          {step.kind === "fill" && <FillExercise step={step} feedback={feedback} setFeedback={setFeedback} />}
          {step.kind === "listen" && <ListenExercise step={step} feedback={feedback} setFeedback={setFeedback} />}
          {step.kind === "match" && <MatchExercise step={step} feedback={feedback} setFeedback={setFeedback} />}
          {step.kind === "order" && <OrderPsalmExercise step={step} feedback={feedback} setFeedback={setFeedback} />}
          {step.kind === "speak" && <SpeakExercise step={step} feedback={feedback} setFeedback={setFeedback} />}
        </div>

        <FooterAction step={step} feedback={feedback} onContinue={next} setFeedback={setFeedback} />
      </main>
    </div>
  );
}

/* ---------- Exercises ---------- */

function PrayerStep({ step, onComplete }: { step: Extract<Step, { kind: "prayer" }>; onComplete: () => void }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [tappedWords, setTappedWords] = useState<Set<string>>(new Set());
  const { speak, speaking } = useSpeech();
  const line = step.lines[lineIndex];

  const tapWord = (word: string) => {
    const cleaned = word.replace(/[^a-zA-Z']/g, "").toLowerCase();
    if (!cleaned) return;
    setTappedWords((prev) => new Set(prev).add(cleaned));
    speak(word.replace(/[^a-zA-Z']/g, ""));
  };

  const nextPrayerLine = () => {
    setTappedWords(new Set());
    if (lineIndex + 1 >= step.lines.length) onComplete();
    else setLineIndex(lineIndex + 1);
  };

  const isLast = lineIndex + 1 >= step.lines.length;

  return (
    <div className="pt-2 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-gold/90 shadow-soft">
        <HandHeart className="size-8 text-primary-foreground" />
      </div>
      <p className="mt-5 font-display text-2xl font-bold leading-tight">
        Respira fundo.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Antes da Palavra, o coração.
      </p>

      <div className="mt-8 rounded-3xl border border-border/60 bg-card p-6 text-left shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => speak(line.en)}
            aria-label="Ouvir esta linha"
            className={`flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary active:scale-95 ${speaking ? "animate-pulse" : ""}`}
          >
            <Volume2 className="size-5" />
          </button>
          <button
            onClick={() => speak(line.en, { rate: 0.6 })}
            className="text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            🐢 mais devagar
          </button>
        </div>
        <p className="font-display text-2xl leading-snug">
          {line.en.split(" ").map((word, index) => {
            const cleaned = word.replace(/[^a-zA-Z']/g, "").toLowerCase();
            const isTapped = tappedWords.has(cleaned);
            const isHighlight = line.highlight && cleaned === line.highlight.toLowerCase();
            return (
              <button
                key={`${word}-${index}`}
                onClick={() => tapWord(word)}
                className={`mb-1 mr-1 inline-block rounded px-1 transition ${isHighlight ? "bg-gold/30 font-bold text-foreground" : "hover:bg-primary/10"} ${isTapped ? "text-primary underline decoration-2 underline-offset-4" : ""}`}
              >
                {word}
              </button>
            );
          })}
        </p>
        <p className="mt-3 text-sm italic text-muted-foreground">{line.pt}</p>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Toque em cada palavra para ouvir. Repita em voz alta, sem pressa.
      </p>

      <div className="mt-4">
        <PronunciationRecorder
          expected={line.en}
          pt={line.pt}
          threshold={0.6}
          size="md"
          onResult={() => { /* livre — não pontua a oração */ }}
        />
      </div>

      <button
        onClick={nextPrayerLine}
        className="mt-8 w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground shadow-chunky active:translate-y-1 active:shadow-none"
      >
        {isLast ? "Amém — abrir a Palavra" : "Continuar a oração"}
      </button>
    </div>
  );
}

function IntroStep({ psalm }: { psalm: PsalmLesson }) {
  const { speak } = useSpeech();
  const v1 = psalm.verses[0];
  return (
    <div className="text-center pt-2">
      <div className="mx-auto size-16 rounded-full bg-gradient-hero flex items-center justify-center shadow-soft text-3xl">
        {psalm.emoji}
      </div>
      <p className="mt-4 text-xs uppercase tracking-widest font-semibold text-muted-foreground">
        Salmo de hoje
      </p>
      <h1 className="font-display text-3xl font-bold mt-1">{psalm.title}</h1>
      <p className="mt-1 text-sm text-muted-foreground italic">{psalm.subtitle}</p>

      <div className="mt-6 rounded-3xl bg-card border border-border/60 p-6 text-left shadow-soft">
        <button
          onClick={() => speak(v1.en)}
          className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3"
          aria-label="Ouvir versículo"
        >
          <Volume2 className="size-5" />
        </button>
        <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
          {v1.ref}
        </p>
        <p className="font-display text-xl mt-1 leading-snug">"{v1.en}"</p>
        <p className="text-sm text-muted-foreground mt-2 italic">{v1.pt}</p>
      </div>

      <div className="mt-6">
        <p className="text-xs text-muted-foreground mb-3">
          Palavras que vais guardar hoje
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {psalm.keywords.slice(0, 5).map((k) => (
            <button
              key={k.en}
              onClick={() => speak(k.en)}
              className="px-3 py-1.5 rounded-full bg-gold/15 text-foreground text-xs font-semibold inline-flex items-center gap-1.5 active:scale-95"
            >
              <Volume2 className="size-3" /> {k.en}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function FlashCard({ step }: { step: Extract<Step, { kind: "flash" }> }) {
  const { speak, speaking } = useSpeech();
  useEffect(() => {
    speak(step.en);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.en]);
  return (
    <div className="text-center pt-4">
      <p className="text-xs text-muted-foreground">
        Uma palavra de cada vez.
      </p>
      <div className="mt-5 rounded-3xl bg-gradient-hero text-primary-foreground p-8 shadow-soft">
        <button
          onClick={() => speak(step.en)}
          aria-label="Ouvir palavra"
          className={`mx-auto mb-3 size-12 rounded-full bg-white/20 flex items-center justify-center active:scale-95 transition ${speaking ? "animate-pulse" : ""}`}
        >
          <Volume2 className="size-6" />
        </button>
        <h2 className="font-display text-5xl font-bold">{step.en}</h2>
        {step.ipa && <p className="mt-1 text-sm opacity-80 font-mono">{step.ipa}</p>}
        <p className="mt-2 text-lg opacity-90">{step.pt}</p>
      </div>
      <button
        onClick={() => speak(step.example)}
        className="mt-6 text-sm italic text-muted-foreground inline-flex items-center gap-2 hover:text-primary"
      >
        <Volume2 className="size-4" /> "{step.example}"
      </button>
      <p className="mt-4 text-xs text-muted-foreground">
        Repete baixinho, como quem saboreia.
      </p>
    </div>
  );
}

function TranslateExercise({ step, feedback, setFeedback }: { step: Extract<Step, { kind: "translate" }>; feedback: string; setFeedback: (f: "idle" | "right" | "wrong") => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const correctOrder = useMemo(() => step.en.split(" "), [step.en]);
  const remaining = step.words.filter((w, i) => {
    const used = picked.filter(p => p === w).length;
    const total = step.words.slice(0, i + 1).filter(x => x === w).length;
    return used < total;
  });

  const check = () => {
    const correct = picked.join(" ") === correctOrder.join(" ");
    setFeedback(correct ? "right" : "wrong");
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Diga em inglês, com o coração</h2>
      <p className="mt-2 text-base text-muted-foreground italic">"{step.pt}"</p>

      <div className="mt-6 min-h-24 border-b-2 border-dashed border-border pb-3 flex flex-wrap gap-2">
        {picked.map((w, i) => (
          <button
            key={i}
            onClick={() => setPicked(picked.filter((_, j) => j !== i))}
            className="px-3 py-2 rounded-xl bg-card border-2 border-border shadow-chunky-locked font-bold"
          >
            {w}
          </button>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {remaining.map((w, i) => (
          <button
            key={`${w}-${i}`}
            onClick={() => setPicked([...picked, w])}
            className="px-3 py-2 rounded-xl bg-card border-2 border-border shadow-chunky-locked font-bold hover:border-primary"
          >
            {w}
          </button>
        ))}
      </div>

      {feedback === "idle" && picked.length > 0 && (
        <Button onClick={check} className="hidden" id="auto-check" />
      )}
      {picked.length === correctOrder.length && feedback === "idle" && (
        <button
          onClick={check}
          className="mt-6 w-full py-3 rounded-2xl bg-success text-success-foreground font-bold shadow-chunky-success active:translate-y-1 active:shadow-none"
        >
          Conferir
        </button>
      )}
    </div>
  );
}

function ChoiceExercise({ step, feedback, setFeedback }: { step: Extract<Step, { kind: "choice" }>; feedback: string; setFeedback: (f: "idle" | "right" | "wrong") => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  const handle = (i: number) => {
    setSelected(i);
    setFeedback(step.options[i].correct ? "right" : "wrong");
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">O que esta oração diz?</h2>
      <p className="mt-2 text-muted-foreground italic">{step.prompt}</p>
      <div className="mt-6 space-y-3">
        {step.options.map((opt, i) => {
          const isSel = selected === i;
          const cls = isSel
            ? opt.correct
              ? "border-success bg-success/10"
              : "border-destructive bg-destructive/10"
            : "border-border bg-card hover:border-primary";
          return (
            <button
              key={i}
              disabled={feedback !== "idle"}
              onClick={() => handle(i)}
              className={`w-full text-left px-4 py-4 rounded-2xl border-2 ${cls} font-semibold shadow-chunky-locked active:translate-y-1 active:shadow-none transition`}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FillExercise({ step, feedback, setFeedback }: { step: Extract<Step, { kind: "fill" }>; feedback: string; setFeedback: (f: "idle" | "right" | "wrong") => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const handle = (w: string) => {
    setSelected(w);
    setFeedback(w === step.answer ? "right" : "wrong");
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Que palavra falta no Salmo?</h2>
      <p className="mt-2 text-sm text-muted-foreground">Escuta o coração — ela já está aí.</p>
      <div className="mt-8 text-2xl font-display flex flex-wrap items-center justify-center gap-2 text-center">
        {step.sentence.map((w, i) =>
          i === step.blank ? (
            <span key={i} className={`px-4 py-1 rounded-xl border-b-4 ${selected ? "border-primary bg-primary/10" : "border-dashed border-muted-foreground"}`}>
              {selected || "____"}
            </span>
          ) : (
            <span key={i}>{w}</span>
          )
        )}
      </div>
      <div className="mt-10 flex flex-wrap gap-3 justify-center">
        {step.options.map((w) => (
          <button
            key={w}
            disabled={feedback !== "idle"}
            onClick={() => handle(w)}
            className="px-4 py-3 rounded-xl bg-card border-2 border-border shadow-chunky-locked font-bold hover:border-primary disabled:opacity-60"
          >
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

function ListenExercise({ step, feedback, setFeedback }: { step: Extract<Step, { kind: "listen" }>; feedback: string; setFeedback: (f: "idle" | "right" | "wrong") => void }) {
  const { speak, speaking, supported } = useSpeech();
  const [picked, setPicked] = useState<string[]>([]);
  const expected = step.expected.split(" ");
  const remaining = step.words.filter((w, i) => picked.filter(p => p === w).length < step.words.slice(0, i + 1).filter(x => x === w).length);

  const check = () => setFeedback(picked.join(" ") === step.expected ? "right" : "wrong");

  useEffect(() => {
    if (supported) speak(step.en);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.en, supported]);

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Escuta a Palavra</h2>
      <p className="mt-2 text-sm text-muted-foreground">Fecha os olhos se quiser. Depois monte o que ouviste.</p>
      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          onClick={() => speak(step.en)}
          disabled={!supported}
          className={`flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-hero text-primary-foreground font-bold shadow-chunky active:translate-y-1 active:shadow-none disabled:opacity-50 ${speaking ? "animate-pulse" : ""}`}
        >
          <Volume2 className="size-6" /> {speaking ? "Tocando..." : "Ouvir de novo"}
        </button>
        <button
          onClick={() => speak(step.en, { rate: 0.6 })}
          disabled={!supported}
          className="text-xs font-semibold text-muted-foreground hover:text-primary"
        >
          🐢 mais devagar
        </button>
      </div>
      <div className="mt-8 min-h-20 border-b-2 border-dashed border-border pb-3 flex flex-wrap gap-2">
        {picked.map((w, i) => (
          <button key={i} onClick={() => setPicked(picked.filter((_, j) => j !== i))} className="px-3 py-2 rounded-xl bg-card border-2 border-border shadow-chunky-locked font-bold">
            {w}
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {remaining.map((w, i) => (
          <button key={`${w}-${i}`} onClick={() => setPicked([...picked, w])} className="px-3 py-2 rounded-xl bg-card border-2 border-border shadow-chunky-locked font-bold hover:border-primary">
            {w}
          </button>
        ))}
      </div>
      {picked.length === expected.length && feedback === "idle" && (
        <button onClick={check} className="mt-6 w-full py-3 rounded-2xl bg-success text-success-foreground font-bold shadow-chunky-success active:translate-y-1 active:shadow-none">
          Conferir
        </button>
      )}
    </div>
  );
}

function MatchExercise({ step, feedback, setFeedback }: { step: Extract<Step, { kind: "match" }>; feedback: string; setFeedback: (f: "idle" | "right" | "wrong") => void }) {
  const ens = useMemo(() => [...step.pairs].sort(() => 0.5 - Math.random()).map(p => p.en), [step]);
  const pts = useMemo(() => [...step.pairs].sort(() => 0.5 - Math.random()).map(p => p.pt), [step]);
  const [selEn, setSelEn] = useState<string | null>(null);
  const [selPt, setSelPt] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);

  useEffect(() => {
    if (selEn && selPt) {
      const isPair = step.pairs.some(p => p.en === selEn && p.pt === selPt);
      if (isPair) {
        setMatched(new Set([...matched, selEn]));
        setSelEn(null);
        setSelPt(null);
      } else {
        setWrong(`${selEn}-${selPt}`);
        setTimeout(() => {
          setWrong(null);
          setSelEn(null);
          setSelPt(null);
        }, 600);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selEn, selPt]);

  useEffect(() => {
    if (matched.size === step.pairs.length && feedback === "idle") {
      setFeedback("right");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matched]);

  const cellCls = (active: boolean, isMatched: boolean, isWrong: boolean) => {
    if (isMatched) return "bg-success/20 border-success text-success line-through opacity-60";
    if (isWrong) return "bg-destructive/20 border-destructive text-destructive";
    if (active) return "bg-primary text-primary-foreground border-primary";
    return "bg-card border-border hover:border-primary";
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Conhecer pelo nome</h2>
      <p className="mt-2 text-sm text-muted-foreground">Cada palavra inglesa tem um irmão em português. Encontra-os.</p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <div className="space-y-3">
          {ens.map(en => {
            const isMatched = matched.has(en);
            const active = selEn === en;
            const isWrong = wrong?.startsWith(`${en}-`) ?? false;
            return (
              <button
                key={en}
                disabled={isMatched}
                onClick={() => setSelEn(en)}
                className={`w-full px-3 py-4 rounded-2xl border-2 font-bold shadow-chunky-locked active:translate-y-1 active:shadow-none transition ${cellCls(active, isMatched, isWrong)}`}
              >
                {en}
              </button>
            );
          })}
        </div>
        <div className="space-y-3">
          {pts.map(pt => {
            const pair = step.pairs.find(p => p.pt === pt)!;
            const isMatched = matched.has(pair.en);
            const active = selPt === pt;
            const isWrong = wrong?.endsWith(`-${pt}`) ?? false;
            return (
              <button
                key={pt}
                disabled={isMatched}
                onClick={() => setSelPt(pt)}
                className={`w-full px-3 py-4 rounded-2xl border-2 font-bold shadow-chunky-locked active:translate-y-1 active:shadow-none transition ${cellCls(active, isMatched, isWrong)}`}
              >
                {pt}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OrderPsalmExercise({ step, feedback, setFeedback }: { step: Extract<Step, { kind: "order" }>; feedback: string; setFeedback: (f: "idle" | "right" | "wrong") => void }) {
  const shuffled = useMemo(() => [...step.lines].sort(() => 0.5 - Math.random()), [step]);
  const [order, setOrder] = useState<string[]>(shuffled);

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    const copy = [...order];
    [copy[i], copy[j]] = [copy[j], copy[i]];
    setOrder(copy);
  };

  const check = () => {
    const correct = order.every((l, i) => l === step.lines[i]);
    setFeedback(correct ? "right" : "wrong");
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Recompor o Salmo</h2>
      <p className="mt-2 text-sm text-muted-foreground">{step.reference}</p>

      <div className="mt-6 space-y-2">
        {order.map((line, i) => (
          <div
            key={line}
            className="flex items-center gap-2 p-3 rounded-2xl bg-card border-2 border-border shadow-chunky-locked"
          >
            <span className="size-7 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
              {i + 1}
            </span>
            <span className="flex-1 text-sm font-semibold">{line}</span>
            <button
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="size-8 rounded-lg bg-muted text-foreground font-bold disabled:opacity-30"
            >
              ↑
            </button>
            <button
              onClick={() => move(i, 1)}
              disabled={i === order.length - 1}
              className="size-8 rounded-lg bg-muted text-foreground font-bold disabled:opacity-30"
            >
              ↓
            </button>
          </div>
        ))}
      </div>

      {feedback === "idle" && (
        <button
          onClick={check}
          className="mt-6 w-full py-3 rounded-2xl bg-success text-success-foreground font-bold shadow-chunky-success active:translate-y-1 active:shadow-none"
        >
          Conferir
        </button>
      )}
    </div>
  );
}

function SpeakExercise({ step, feedback, setFeedback }: { step: Extract<Step, { kind: "speak" }>; feedback: string; setFeedback: (f: "idle" | "right" | "wrong") => void }) {
  void feedback;
  return (
    <div className="text-center">
      <div className="mx-auto size-14 rounded-full bg-gradient-gold flex items-center justify-center shadow-soft">
        <HandHeart className="size-7 text-white" />
      </div>
      <h2 className="font-display text-2xl font-bold mt-4">Devolva ao Senhor</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
        O Salmo vira oração na sua boca. Diga em voz alta, sem medo de errar.
      </p>

      <div className="mt-4 rounded-2xl bg-card border border-border/60 p-4 text-left shadow-soft">
        <p className="font-display text-lg leading-snug">"{step.en}"</p>
        <p className="text-xs text-muted-foreground mt-1 italic">{step.pt}</p>
      </div>

      <div className="mt-6">
        <PronunciationRecorder
          expected={step.en}
          pt={step.pt}
          threshold={0.7}
          onResult={(r) => setFeedback(r.passed ? "right" : "wrong")}
        />
      </div>
    </div>
  );
}

/* ---------- Footer & Complete ---------- */

function FooterAction({ step, feedback, onContinue, setFeedback }: { step: Step; feedback: string; onContinue: () => void; setFeedback: (f: "idle" | "right" | "wrong") => void }) {
  if (step.kind === "prayer") return null;
  if (step.kind === "flash" || step.kind === "intro") {
    return (
      <div className="mt-6">
        <button onClick={onContinue} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-chunky active:translate-y-1 active:shadow-none">
          {step.kind === "intro" ? "Entrar no Salmo" : "Seguir adiante"}
        </button>
      </div>
    );
  }
  if (feedback === "idle") return <div className="h-20" />;
  const right = feedback === "right";

  // Mensagens calorosas, de irmão na fé. Nada de "errado" ou "wrong".
  const rightMsgs = [
    "É isso. Sente como ressoa.",
    "O coração lembra. Continua.",
    "Bem dito — em outra língua, a mesma fé.",
    "Aleluia. Segue.",
  ];
  const softMsgs = [
    "Quase. Respira e olha de novo.",
    "Sem pressa — a Palavra espera.",
    "Tudo bem. Aprender é caminhar.",
  ];
  const msg = right
    ? rightMsgs[Math.floor(Math.random() * rightMsgs.length)]
    : softMsgs[Math.floor(Math.random() * softMsgs.length)];

  return (
    <div className={`-mx-5 mt-6 px-5 pt-4 pb-5 rounded-t-3xl ${right ? "bg-success/10" : "bg-muted"}`}>
      <div className="flex items-center gap-2">
        <div className={`size-9 rounded-full flex items-center justify-center ${right ? "bg-success text-success-foreground" : "bg-card text-foreground border border-border"}`}>
          {right ? <Check className="size-5" /> : <Heart className="size-5 text-primary" />}
        </div>
        <p className={`font-semibold ${right ? "text-success" : "text-foreground"}`}>
          {msg}
        </p>
      </div>
      <button
        onClick={() => { setFeedback("idle"); onContinue(); }}
        className={`mt-3 w-full py-3 rounded-2xl font-bold shadow-chunky-success active:translate-y-1 active:shadow-none ${right ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground"}`}
      >
        Continuar
      </button>
    </div>
  );
}

function LessonComplete({ day, psalm }: { day: string; psalm: PsalmLesson }) {
  const { speak } = useSpeech();
  const mv = psalm.memoryVerse;
  return (
    <div className="min-h-screen bg-gradient-sky flex items-center justify-center px-6">
      <div className="text-center max-w-sm animate-pop-in">
        <div className="mx-auto size-20 rounded-full bg-gradient-gold flex items-center justify-center shadow-soft">
          <Sparkles className="size-10 text-white" />
        </div>
        <h1 className="font-display text-3xl font-bold mt-6 leading-tight">
          A Palavra ficou em ti.
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Dia {day} • {psalm.title}
        </p>

        <div className="mt-6 rounded-3xl bg-card border border-border/60 p-5 text-left shadow-soft">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-primary">
            Guarda no coração • {mv.ref}
          </p>
          <p className="font-display text-lg mt-2 leading-snug">"{mv.en}"</p>
          <p className="text-xs text-muted-foreground mt-1 italic">{mv.pt}</p>
          <button
            onClick={() => speak(mv.en)}
            className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-primary"
          >
            <Volume2 className="size-4" /> Ouvir mais uma vez
          </button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground italic px-2">
          Leva esta palavra contigo pelo dia. Repete-a baixinho.
        </p>

        <Link to="/" className="mt-6 inline-block w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold shadow-chunky active:translate-y-1 active:shadow-none">
          Voltar à jornada
        </Link>
      </div>
    </div>
  );
}

void AppHeader;
