import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ArrowLeft, Volume2, Check, X, Sparkles, HandHeart, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PronunciationRecorder } from "@/components/PronunciationRecorder";
import { useSpeech } from "@/hooks/useSpeech";
import { getPsalmByDay, type PsalmLesson } from "@/data/psalms";

export const Route = createFileRoute("/lesson/$day")({
  head: () => ({
    meta: [
      { title: "Salmo do dia — Lumen" },
      { name: "description", content: "Aprenda inglês com os Salmos. Vocabulário, pronúncia e versículos memorizados." },
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

  // 1. Flashcards for the first 2 keywords
  for (const w of psalm.keywords.slice(0, 2)) {
    steps.push({
      kind: "flash",
      en: w.en,
      pt: w.pt,
      ipa: w.ipa,
      example: w.example ?? `${w.en}.`,
    });
  }

  // 2. Match all keywords (max 5)
  steps.push({
    kind: "match",
    pairs: psalm.keywords.slice(0, 5).map((k) => ({ en: capitalize(k.en), pt: capitalize(k.pt) })),
  });

  // 3. Translate first verse — distractors come from other keywords
  const v1 = psalm.verses[0];
  const distractors = psalm.keywords.map((k) => capitalize(k.en)).slice(0, 3);
  steps.push({
    kind: "translate",
    en: v1.en,
    pt: v1.pt,
    words: shuffle([...v1.en.split(/\s+/), ...distractors]),
  });

  // 4. Listen exercise on the second verse (or repeat first)
  const vListen = psalm.verses[1] ?? v1;
  const listenWords = vListen.en.split(/\s+/);
  steps.push({
    kind: "listen",
    en: vListen.en,
    expected: vListen.en,
    words: shuffle([...listenWords, ...distractors.slice(0, 2)]),
  });

  // 5. Fill-in-the-blank using a keyword from a verse
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

  // 6. Multiple choice — meaning of memory verse
  const mv = psalm.memoryVerse;
  steps.push({
    kind: "choice",
    prompt: `Qual a tradução de "${mv.en}"?`,
    options: shuffle([
      { text: mv.pt, correct: true },
      ...psalm.verses.filter((v) => v.pt !== mv.pt).slice(0, 2).map((v) => ({ text: v.pt, correct: false })),
    ]),
  });

  // 7. Order verses if 3+
  if (psalm.verses.length >= 3) {
    steps.push({
      kind: "order",
      reference: `${psalm.title} (excerpt)`,
      lines: psalm.verses.slice(0, 4).map((v) => v.en),
    });
  }

  // 8. Speak the memory verse
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

const GUIDED_PRAYERS: GuidedPrayerLine[][] = [
  [
    { en: "Dear God, thank You for this new day.", pt: "Querido Deus, obrigado por este novo dia.", highlight: "God" },
    { en: "As we begin, we ask for Your presence with us.", pt: "Ao começarmos, pedimos a Tua presença conosco.", highlight: "presence" },
    { en: "Give us wisdom to understand, strength to keep going, and hearts willing to learn and grow.", pt: "Dá-nos sabedoria para entender, força para continuar e corações dispostos a aprender e crescer.", highlight: "wisdom" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Lord, we come before You with open hearts.", pt: "Senhor, chegamos diante de Ti com corações abertos.", highlight: "Lord" },
    { en: "Guide our minds, calm our thoughts, and help us receive what we need today.", pt: "Guia nossas mentes, acalma nossos pensamentos e ajuda-nos a receber o que precisamos hoje.", highlight: "Guide" },
    { en: "Let this moment be filled with peace and purpose.", pt: "Que este momento seja cheio de paz e propósito.", highlight: "peace" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "God, thank You for the opportunity to learn and grow.", pt: "Deus, obrigado pela oportunidade de aprender e crescer.", highlight: "opportunity" },
    { en: "Help us to be attentive, patient, and humble, so we can truly understand and use what we receive today.", pt: "Ajuda-nos a ser atentos, pacientes e humildes, para realmente entender e usar o que recebemos hoje.", highlight: "patient" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Dear Lord, as we start this moment, we ask for clarity and focus.", pt: "Querido Senhor, ao iniciar este momento, pedimos clareza e foco.", highlight: "clarity" },
    { en: "Remove distractions and fill our minds with good thoughts and understanding.", pt: "Remove as distrações e enche nossas mentes com bons pensamentos e entendimento.", highlight: "understanding" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Father, we trust You with this time.", pt: "Pai, confiamos este tempo a Ti.", highlight: "Father" },
    { en: "Give us discipline to stay focused, courage to try, and wisdom to learn even from challenges.", pt: "Dá-nos disciplina para manter o foco, coragem para tentar e sabedoria para aprender até com os desafios.", highlight: "courage" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "God, open our hearts and minds today.", pt: "Deus, abre nossos corações e mentes hoje.", highlight: "open" },
    { en: "Help us not only to learn, but to grow as people, becoming wiser, calmer, and more patient.", pt: "Ajuda-nos não apenas a aprender, mas a crescer como pessoas, tornando-nos mais sábios, calmos e pacientes.", highlight: "grow" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Lord, let this be a time of peace and learning.", pt: "Senhor, que este seja um tempo de paz e aprendizado.", highlight: "learning" },
    { en: "Help us stay present, think clearly, and absorb everything that will help us grow.", pt: "Ajuda-nos a estar presentes, pensar com clareza e absorver tudo que nos ajudará a crescer.", highlight: "present" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Dear God, we ask for calm minds and focused hearts.", pt: "Querido Deus, pedimos mentes calmas e corações focados.", highlight: "focused" },
    { en: "Help us to be present in this moment and give our best in everything we do.", pt: "Ajuda-nos a estar presentes neste momento e dar o nosso melhor em tudo que fazemos.", highlight: "best" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Father, guide our thoughts and give us understanding.", pt: "Pai, guia nossos pensamentos e dá-nos entendimento.", highlight: "thoughts" },
    { en: "Help us to learn with intention and carry this knowledge with us beyond this moment.", pt: "Ajuda-nos a aprender com intenção e levar este conhecimento além deste momento.", highlight: "knowledge" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Lord, fill this moment with Your peace.", pt: "Senhor, enche este momento com a Tua paz.", highlight: "peace" },
    { en: "Remove anxiety and confusion, and replace it with clarity, wisdom, and confidence.", pt: "Remove a ansiedade e a confusão, e substitui por clareza, sabedoria e confiança.", highlight: "confidence" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "God, help us to be patient with ourselves and with the process of learning.", pt: "Deus, ajuda-nos a ser pacientes conosco e com o processo de aprender.", highlight: "patient" },
    { en: "Give us strength to keep going and not give up.", pt: "Dá-nos força para continuar e não desistir.", highlight: "strength" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Dear Lord, as we begin, help us to be mindful and focused.", pt: "Querido Senhor, ao começarmos, ajuda-nos a estar atentos e focados.", highlight: "mindful" },
    { en: "Let this be a time of growth, learning, and inner peace.", pt: "Que este seja um tempo de crescimento, aprendizado e paz interior.", highlight: "growth" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Father, thank You for this opportunity.", pt: "Pai, obrigado por esta oportunidade.", highlight: "opportunity" },
    { en: "Help us to value this moment and make the most of it with attention and dedication.", pt: "Ajuda-nos a valorizar este momento e aproveitá-lo ao máximo com atenção e dedicação.", highlight: "dedication" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "Lord, guide our minds and give us clarity in everything we do.", pt: "Senhor, guia nossas mentes e dá-nos clareza em tudo que fazemos.", highlight: "clarity" },
    { en: "Help us to understand deeply and remember what is important.", pt: "Ajuda-nos a entender profundamente e lembrar o que é importante.", highlight: "remember" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
  [
    { en: "God, we place this moment in Your hands.", pt: "Deus, colocamos este momento em Tuas mãos.", highlight: "hands" },
    { en: "Lead us with wisdom, fill us with peace, and help us to grow in knowledge and understanding.", pt: "Conduz-nos com sabedoria, enche-nos de paz e ajuda-nos a crescer em conhecimento e entendimento.", highlight: "wisdom" },
    { en: "Amen.", pt: "Amém.", highlight: "Amen" },
  ],
];

function buildGuidedPrayer(psalm: PsalmLesson): GuidedPrayerLine[] {
  return GUIDED_PRAYERS[(psalm.day - 1) % GUIDED_PRAYERS.length];
}

/** Friendly labels shown in the header so users know exactly what kind of step they're on. */
const STEP_LABELS: Record<Step["kind"], string> = {
  prayer: "Oração",
  intro: "Introdução",
  flash: "Vocabulário",
  match: "Pareamento",
  translate: "Tradução",
  listen: "Escuta",
  fill: "Complete",
  choice: "Escolha",
  order: "Ordenar",
  speak: "Pronúncia",
};

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

  // Progress now reflects the CURRENT step (idx+1) so the bar matches the counter.
  const stepNumber = idx + 1;
  const currentProgress = (stepNumber / total) * 100;
  const stepLabel = STEP_LABELS[step.kind];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-1 -ml-1 text-muted-foreground hover:text-foreground" aria-label="Voltar para início">
            <ArrowLeft className="size-6" />
          </Link>
          <div className="flex-1">
            <div
              className="h-3 bg-muted rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={stepNumber}
              aria-valuemin={1}
              aria-valuemax={total}
              aria-label={`Etapa ${stepNumber} de ${total}`}
            >
              <div
                className="h-full bg-success transition-all duration-500"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>
          <span
            className="text-xs font-extrabold tabular-nums text-muted-foreground"
            aria-hidden="true"
          >
            {stepNumber}/{total}
          </span>
        </div>
        <div className="max-w-md mx-auto px-4 pb-2 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <BookOpen className="size-3.5 shrink-0 text-primary" />
            <span className="font-bold text-primary uppercase tracking-widest truncate">{psalm.title}</span>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-primary">
            Etapa {stepNumber} • {stepLabel}
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-6 flex flex-col">
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
  const [score, setScore] = useState<number | null>(null);
  const { speak, speaking } = useSpeech();
  const line = step.lines[lineIndex];

  const tapWord = (word: string) => {
    const cleaned = word.replace(/[^a-zA-Z']/g, "").toLowerCase();
    if (!cleaned) return;
    setTappedWords((prev) => new Set(prev).add(cleaned));
    speak(word.replace(/[^a-zA-Z']/g, ""));
  };

  const nextPrayerLine = () => {
    setScore(null);
    setTappedWords(new Set());
    if (lineIndex + 1 >= step.lines.length) onComplete();
    else setLineIndex(lineIndex + 1);
  };

  return (
    <div className="pt-2 text-center">
      <div className="mx-auto flex size-20 items-center justify-center rounded-3xl bg-gradient-gold shadow-chunky-gold">
        <HandHeart className="size-10 text-primary-foreground" />
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Oração guiada • Dia {step.psalm.day}
      </p>
      <h1 className="mt-1 font-display text-3xl font-bold">Antes de começar</h1>
      <p className="mt-2 text-sm font-semibold text-muted-foreground">
        Linha {lineIndex + 1} de {step.lines.length} • ouça, toque nas palavras e repita.
      </p>

      <div className="mt-6 rounded-3xl border-2 border-border bg-card p-5 text-left shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => speak(line.en)}
            aria-label="Ouvir oração"
            className={`flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary active:scale-95 ${speaking ? "animate-pulse" : ""}`}
          >
            <Volume2 className="size-5" />
          </button>
          <button
            onClick={() => speak(line.en, { rate: 0.6 })}
            className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            🐢 Devagar
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

      <div className="mt-6">
        <p className="mb-3 text-sm text-muted-foreground">
          {score !== null ? `Pronúncia: ${Math.round(score * 100)}%` : "Toque no microfone e repita a oração"}
        </p>
        <PronunciationRecorder expected={line.en} pt={line.pt} threshold={0.6} size="md" onResult={(result) => setScore(result.accuracy)} />
      </div>

      <button onClick={nextPrayerLine} className="mt-6 w-full rounded-2xl bg-primary py-4 font-bold uppercase tracking-wide text-primary-foreground shadow-chunky active:translate-y-1 active:shadow-none">
        {lineIndex + 1 >= step.lines.length ? "Amém • Ir para aula" : "Próxima linha"}
      </button>
    </div>
  );
}

function IntroStep({ psalm }: { psalm: PsalmLesson }) {
  const { speak } = useSpeech();
  const v1 = psalm.verses[0];
  return (
    <div className="text-center pt-2">
      <div className="mx-auto size-20 rounded-3xl bg-gradient-hero flex items-center justify-center shadow-chunky text-4xl">
        {psalm.emoji}
      </div>
      <p className="mt-4 text-xs uppercase tracking-widest font-bold text-muted-foreground">
        {psalm.subtitle}
      </p>
      <h1 className="font-display text-3xl font-bold mt-1">{psalm.title}</h1>

      <div className="mt-6 rounded-3xl bg-card border-2 border-border p-5 text-left shadow-soft">
        <button
          onClick={() => speak(v1.en)}
          className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3"
          aria-label="Ouvir versículo"
        >
          <Volume2 className="size-5" />
        </button>
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
          {v1.ref}
        </p>
        <p className="font-display text-xl mt-1 leading-snug">"{v1.en}"</p>
        <p className="text-sm text-muted-foreground mt-2 italic">{v1.pt}</p>
      </div>

      <div className="mt-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          Você vai aprender
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {psalm.keywords.slice(0, 5).map((k) => (
            <button
              key={k.en}
              onClick={() => speak(k.en)}
              className="px-3 py-1.5 rounded-full bg-gold/20 text-foreground text-xs font-bold inline-flex items-center gap-1"
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
  // Auto-play the new word once when the card appears.
  useEffect(() => {
    speak(step.en);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.en]);
  return (
    <div className="text-center pt-4">
      <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Nova palavra</p>
      <div className="mt-6 rounded-3xl bg-gradient-hero text-primary-foreground p-8 shadow-soft">
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
      <h2 className="font-display text-2xl font-bold">Traduza esta frase</h2>
      <p className="mt-2 text-base text-muted-foreground">"{step.pt}"</p>

      <div className="mt-6 min-h-24 border-b-2 border-border pb-3 flex flex-wrap gap-2">
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
          className="mt-6 w-full py-3 rounded-2xl bg-success text-success-foreground font-bold uppercase tracking-wide shadow-chunky-success active:translate-y-1 active:shadow-none"
        >
          Verificar
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
      <h2 className="font-display text-2xl font-bold">Escolha a tradução correta</h2>
      <p className="mt-2 text-muted-foreground">{step.prompt}</p>
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
      <h2 className="font-display text-2xl font-bold">Complete o versículo</h2>
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

  // Play once on mount so the user immediately hears the sentence.
  useEffect(() => {
    if (supported) speak(step.en);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.en, supported]);

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Ouça e escreva</h2>
      <div className="mt-6 flex flex-col items-center gap-2">
        <button
          onClick={() => speak(step.en)}
          disabled={!supported}
          className={`flex items-center gap-3 px-6 py-4 rounded-2xl bg-gradient-hero text-primary-foreground font-bold shadow-chunky active:translate-y-1 active:shadow-none disabled:opacity-50 ${speaking ? "animate-pulse" : ""}`}
        >
          <Volume2 className="size-6" /> {speaking ? "Tocando..." : "Tocar áudio"}
        </button>
        <button
          onClick={() => speak(step.en, { rate: 0.6 })}
          disabled={!supported}
          className="text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-primary"
        >
          🐢 Mais devagar
        </button>
      </div>
      <div className="mt-8 min-h-20 border-b-2 border-border pb-3 flex flex-wrap gap-2">
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
        <button onClick={check} className="mt-6 w-full py-3 rounded-2xl bg-success text-success-foreground font-bold uppercase tracking-wide shadow-chunky-success active:translate-y-1 active:shadow-none">
          Verificar
        </button>
      )}
    </div>
  );
}

/* ---------- New game types ---------- */

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
  }, [selEn, selPt]);

  useEffect(() => {
    if (matched.size === step.pairs.length && feedback === "idle") {
      setFeedback("right");
    }
  }, [matched]);

  const cellCls = (active: boolean, isMatched: boolean, isWrong: boolean) => {
    if (isMatched) return "bg-success/20 border-success text-success line-through opacity-60";
    if (isWrong) return "bg-destructive/20 border-destructive text-destructive";
    if (active) return "bg-primary text-primary-foreground border-primary";
    return "bg-card border-border hover:border-primary";
  };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold">Conecte os pares</h2>
      <p className="mt-2 text-muted-foreground">Toque uma palavra em inglês e depois sua tradução.</p>

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
      <h2 className="font-display text-2xl font-bold">Ordene o salmo</h2>
      <p className="mt-2 text-muted-foreground">{step.reference}</p>

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
          className="mt-6 w-full py-3 rounded-2xl bg-success text-success-foreground font-bold uppercase tracking-wide shadow-chunky-success active:translate-y-1 active:shadow-none"
        >
          Verificar ordem
        </button>
      )}
    </div>
  );
}

function SpeakExercise({ step, feedback, setFeedback }: { step: Extract<Step, { kind: "speak" }>; feedback: string; setFeedback: (f: "idle" | "right" | "wrong") => void }) {
  void feedback;
  return (
    <div className="text-center">
      <div className="mx-auto size-14 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-chunky-gold">
        <HandHeart className="size-7 text-white" />
      </div>
      <h2 className="font-display text-2xl font-bold mt-4">Repita em oração</h2>
      <p className="text-sm text-muted-foreground mt-1">Fale com fé — em voz alta.</p>

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
        <button onClick={onContinue} className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold uppercase tracking-wide shadow-chunky active:translate-y-1 active:shadow-none">
          {step.kind === "intro" ? "Começar lição" : "Continuar"}
        </button>
      </div>
    );
  }
  if (feedback === "idle") return <div className="h-20" />;
  const right = feedback === "right";
  return (
    <div className={`-mx-5 mt-6 px-5 pt-4 pb-5 rounded-t-3xl ${right ? "bg-success/15" : "bg-destructive/15"}`}>
      <div className="flex items-center gap-2">
        <div className={`size-9 rounded-full flex items-center justify-center ${right ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}>
          {right ? <Check className="size-5" /> : <X className="size-5" />}
        </div>
        <p className={`font-bold ${right ? "text-success" : "text-destructive"}`}>
          {right ? "Aleluia! Resposta certa." : "Quase! Tente lembrar."}
        </p>
      </div>
      <button
        onClick={() => { setFeedback("idle"); onContinue(); }}
        className={`mt-3 w-full py-3 rounded-2xl font-bold uppercase tracking-wide shadow-chunky-success active:translate-y-1 active:shadow-none ${right ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"}`}
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
        <div className="mx-auto size-24 rounded-full bg-gradient-gold flex items-center justify-center shadow-chunky-gold">
          <Sparkles className="size-12 text-white" />
        </div>
        <h1 className="font-display text-4xl font-bold mt-6">Glória a Deus!</h1>
        <p className="text-muted-foreground mt-2">
          Você completou o {psalm.title} (dia {day}) 🎉
        </p>

        <div className="mt-6 rounded-3xl bg-card border-2 border-border p-5 text-left shadow-soft">
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary">
            Versículo memorizado • {mv.ref}
          </p>
          <p className="font-display text-lg mt-2 leading-snug">"{mv.en}"</p>
          <p className="text-xs text-muted-foreground mt-1 italic">{mv.pt}</p>
          <button
            onClick={() => speak(mv.en)}
            className="mt-3 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"
          >
            <Volume2 className="size-4" /> Ouvir novamente
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat label="XP" value="+15" color="bg-primary text-primary-foreground" />
          <Stat label="Streak" value="🔥 +1" color="bg-gradient-flame text-white" />
          <Stat label="Coroas" value="+1" color="bg-gradient-gold text-white" />
        </div>
        <Link to="/" className="mt-8 inline-block w-full py-4 rounded-2xl bg-success text-success-foreground font-bold uppercase tracking-wide shadow-chunky-success active:translate-y-1 active:shadow-none">
          Voltar à jornada
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`rounded-2xl p-3 ${color}`}>
      <p className="text-xs opacity-90 font-bold uppercase tracking-wide">{label}</p>
      <p className="font-display text-xl font-bold mt-1">{value}</p>
    </div>
  );
}

void AppHeader;
