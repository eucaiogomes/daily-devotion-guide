import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Volume2, Heart, Sparkles } from "lucide-react";
import { PronunciationRecorder } from "@/components/PronunciationRecorder";
import { useSpeech } from "@/hooks/useSpeech";

export const Route = createFileRoute("/devotional/$id")({
  head: () => ({
    meta: [
      { title: "Devocional Interativo — Lumen" },
      {
        name: "description",
        content:
          "Devocional interativo para aprender inglês com salmos, louvores e orações.",
      },
    ],
  }),
  component: DevotionalPage,
});

type DevContent = {
  title: string;
  subtitle: string;
  reference: string;
  intro: { en: string; pt: string };
  lines: { en: string; pt: string; highlight?: string }[];
  reflection: string;
  prayerEn: string;
  prayerPt: string;
};

const LIBRARY: Record<string, DevContent> = {
  "amazing-grace": {
    title: "Amazing Grace",
    subtitle: "Hino clássico • Karaokê devocional",
    reference: "John Newton, 1779",
    intro: {
      en: "A song about God's unmerited favor.",
      pt: "Uma canção sobre o favor imerecido de Deus.",
    },
    lines: [
      { en: "Amazing grace, how sweet the sound", pt: "Maravilhosa graça, quão doce o som", highlight: "grace" },
      { en: "That saved a wretch like me", pt: "Que salvou um miserável como eu", highlight: "saved" },
      { en: "I once was lost, but now am found", pt: "Eu estava perdido, mas agora fui achado", highlight: "found" },
      { en: "Was blind, but now I see", pt: "Era cego, mas agora vejo", highlight: "see" },
    ],
    reflection: "A graça transforma. Como você experimentou a graça hoje?",
    prayerEn: "Lord, thank You for Your amazing grace.",
    prayerPt: "Senhor, obrigado pela Tua maravilhosa graça.",
  },
  "lords-prayer": {
    title: "The Lord's Prayer",
    subtitle: "Pai Nosso • Oração guiada",
    reference: "Matthew 6:9-13",
    intro: {
      en: "Jesus taught us how to pray.",
      pt: "Jesus nos ensinou a orar.",
    },
    lines: [
      { en: "Our Father in heaven", pt: "Pai nosso que estás nos céus", highlight: "Father" },
      { en: "Hallowed be Your name", pt: "Santificado seja o Teu nome", highlight: "Hallowed" },
      { en: "Your kingdom come, Your will be done", pt: "Venha o Teu reino, seja feita a Tua vontade", highlight: "kingdom" },
      { en: "Give us today our daily bread", pt: "Dá-nos hoje o pão de cada dia", highlight: "bread" },
      { en: "And forgive us our debts", pt: "E perdoa as nossas dívidas", highlight: "forgive" },
    ],
    reflection: "Qual parte desta oração toca seu coração hoje?",
    prayerEn: "Amen. In Jesus' name.",
    prayerPt: "Amém. Em nome de Jesus.",
  },
};

function DevotionalPage() {
  const { id } = Route.useParams();
  const content = LIBRARY[id] ?? LIBRARY["amazing-grace"];
  const [step, setStep] = useState(0);
  const [tappedWords, setTappedWords] = useState<Set<string>>(new Set());
  const total = content.lines.length + 2; // intro + lines + reflection
  const { speak } = useSpeech();

  const progress = ((step + 1) / total) * 100;

  const tapWord = (w: string) => {
    const cleaned = w.replace(/[^a-zA-Z']/g, "").toLowerCase();
    if (!cleaned) return;
    setTappedWords((prev) => new Set(prev).add(cleaned));
    // Speak the tapped word so users learn its sound.
    speak(w.replace(/[^a-zA-Z']/g, ""));
  };

  return (
    <div className="min-h-screen bg-gradient-sky flex flex-col">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="p-1 -ml-1 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-6" />
          </Link>
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-gradient-hero transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-bold text-primary">{step + 1}/{total}</span>
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-5 py-6">
        {step === 0 && (
          <div className="animate-pop-in text-center">
            <div className="mx-auto size-20 rounded-3xl bg-gradient-hero flex items-center justify-center shadow-chunky">
              <Sparkles className="size-10 text-white" />
            </div>
            <p className="text-xs uppercase tracking-widest font-bold text-muted-foreground mt-5">
              {content.subtitle}
            </p>
            <h1 className="font-display text-4xl font-bold mt-2">{content.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">{content.reference}</p>

            <div className="mt-8 rounded-3xl bg-card border-2 border-border p-5 text-left shadow-soft">
              <button
                onClick={() => speak(content.intro.en)}
                aria-label="Ouvir introdução"
                className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3"
              >
                <Volume2 className="size-5" />
              </button>
              <p className="text-lg font-display italic">"{content.intro.en}"</p>
              <p className="text-sm text-muted-foreground mt-2">{content.intro.pt}</p>
            </div>
          </div>
        )}

        {step > 0 && step <= content.lines.length && (
          <DevotionalLine
            line={content.lines[step - 1]}
            index={step}
            tappedWords={tappedWords}
            onTapWord={tapWord}
          />
        )}

        {step === content.lines.length + 1 && (
          <ReflectionStep content={content} />
        )}
      </main>

      <footer className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border">
        <div className="max-w-md mx-auto px-5 py-4">
          {step < total - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-bold uppercase tracking-wide shadow-chunky active:translate-y-1 active:shadow-none"
            >
              Continuar
            </button>
          ) : (
            <Link
              to="/"
              className="block text-center w-full py-4 rounded-2xl bg-success text-success-foreground font-bold uppercase tracking-wide shadow-chunky-success active:translate-y-1 active:shadow-none"
            >
              Amém • Concluir
            </Link>
          )}
        </div>
      </footer>
    </div>
  );
}

function DevotionalLine({
  line,
  index,
  tappedWords,
  onTapWord,
}: {
  line: { en: string; pt: string; highlight?: string };
  index: number;
  tappedWords: Set<string>;
  onTapWord: (w: string) => void;
}) {
  const [score, setScore] = useState<number | null>(null);
  const { speak, speaking } = useSpeech();

  return (
    <div className="animate-pop-in">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
        Linha {index}
      </p>

      <div className="mt-4 rounded-3xl bg-card border-2 border-border p-5 shadow-soft">
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => speak(line.en)}
            aria-label="Ouvir linha"
            className={`size-11 rounded-full bg-primary/10 text-primary flex items-center justify-center active:scale-95 ${speaking ? "animate-pulse" : ""}`}
          >
            <Volume2 className="size-5" />
          </button>
          <button
            onClick={() => speak(line.en, { rate: 0.6 })}
            className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-primary"
          >
            🐢 Devagar
          </button>
        </div>

        <p className="font-display text-2xl leading-snug">
          {line.en.split(" ").map((w, i) => {
            const cleaned = w.replace(/[^a-zA-Z']/g, "").toLowerCase();
            const isTapped = tappedWords.has(cleaned);
            const isHighlight =
              line.highlight && cleaned === line.highlight.toLowerCase();
            return (
              <button
                key={i}
                onClick={() => onTapWord(w)}
                className={`inline-block mr-1 mb-1 px-1 rounded transition ${
                  isHighlight
                    ? "bg-gold/30 text-foreground font-bold"
                    : "hover:bg-primary/10"
                } ${isTapped ? "text-primary underline decoration-2 underline-offset-4" : ""}`}
              >
                {w}
              </button>
            );
          })}
        </p>
        <p className="text-sm text-muted-foreground mt-3 italic">{line.pt}</p>

        {line.highlight && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/20 text-foreground text-xs font-bold">
            <Sparkles className="size-3" /> Toque nas palavras para aprender
          </div>
        )}
      </div>

      <div className="mt-6">
        <p className="text-sm text-muted-foreground text-center mb-3">
          {score !== null ? `Pronúncia: ${Math.round(score * 100)}%` : "Toque no microfone e repita"}
        </p>
        <PronunciationRecorder
          expected={line.en}
          pt={line.pt}
          threshold={0.6}
          size="md"
          onResult={(r) => setScore(r.accuracy)}
        />
      </div>
    </div>
  );
}

function ReflectionStep({ content }: { content: DevContent }) {
  const [note, setNote] = useState("");
  return (
    <div className="animate-pop-in">
      <div className="mx-auto size-16 rounded-2xl bg-gradient-gold flex items-center justify-center shadow-chunky-gold">
        <Heart className="size-8 text-white fill-current" />
      </div>
      <h2 className="font-display text-3xl font-bold mt-5 text-center">
        Reflexão
      </h2>
      <p className="text-muted-foreground mt-2 text-center px-4">
        {content.reflection}
      </p>

      <div className="mt-6 rounded-3xl bg-gradient-hero text-primary-foreground p-5 shadow-soft">
        <p className="text-xs uppercase tracking-widest font-bold opacity-80">
          Oração final
        </p>
        <p className="font-display text-xl mt-2 leading-snug">"{content.prayerEn}"</p>
        <p className="text-sm mt-2 opacity-90">{content.prayerPt}</p>
      </div>

      <div className="mt-6">
        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Anote sua intenção (opcional)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Pelo que você quer orar hoje?"
          className="mt-2 w-full rounded-2xl bg-card border-2 border-border p-3 text-sm focus:outline-none focus:border-primary"
        />
      </div>
    </div>
  );
}
