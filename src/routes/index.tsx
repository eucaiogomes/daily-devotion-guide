import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { getPsalmByDay, TOTAL_DAYS } from "@/data/psalms";
import { isMissionCompletedToday, syncOfflineMissions } from "@/lib/offlineMission";
import { CheckCircle2, Play, Sparkles } from "lucide-react";
import doveMascot from "@/assets/dove-mascot.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen — Devocional do dia" },
      {
        name: "description",
        content:
          "Aprenda inglês todos os dias com os Salmos. Um devocional guiado por dia, simples e direto.",
      },
      { property: "og:title", content: "Lumen — Inglês com os Salmos" },
      { property: "og:description", content: "Devocional diário guiado para aprender inglês com os Salmos." },
    ],
  }),
  component: Index,
});

/** Currently unlocked day. Bump this once persistence is wired up. */
const CURRENT_DAY = 1;

function Index() {
  const today = getPsalmByDay(CURRENT_DAY);
  const v1 = today.verses[0];
  const [done, setDone] = useState(false);
  const yearProgress = Math.round((CURRENT_DAY / TOTAL_DAYS) * 100);

  useEffect(() => {
    setDone(isMissionCompletedToday(CURRENT_DAY));
    // Best-effort sync of any offline completions when the home loads.
    syncOfflineMissions().catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-sky pb-28">
      <AppHeader streak={3} gold={42} hearts={5} />

      <main className="mx-auto flex max-w-md flex-col px-5 pt-6">
        {/* Header curto: dia + progresso anual */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Devocional de hoje
            </p>
            <h1 className="font-display text-3xl font-bold leading-tight">
              Dia {CURRENT_DAY}
              <span className="text-base font-bold text-muted-foreground"> / {TOTAL_DAYS}</span>
            </h1>
          </div>
          <span className="rounded-full bg-card px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary border border-border shadow-sm">
            {yearProgress}% da jornada
          </span>
        </div>

        {/* Card central: versículo do dia + CTA grande */}
        <section className="relative mt-6 overflow-hidden rounded-3xl bg-gradient-hero p-6 text-primary-foreground shadow-soft">
          <div className="absolute -right-6 -bottom-6 opacity-90 animate-float-slow pointer-events-none">
            <img
              src={doveMascot}
              alt=""
              aria-hidden="true"
              width={180}
              height={180}
              className="size-44"
            />
          </div>

          <div className="relative">
            <p className="text-[11px] font-extrabold uppercase tracking-widest opacity-80">
              {today.title}
            </p>

            <p className="mt-3 font-display text-2xl leading-snug">
              "{v1.en}"
            </p>
            <p className="mt-2 text-sm italic opacity-80 leading-snug max-w-[18rem]">
              {v1.pt}
            </p>
            <p className="mt-2 text-xs font-bold opacity-90">— {v1.ref}</p>

            <Link
              to="/lesson/$day"
              params={{ day: String(CURRENT_DAY) }}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary-foreground py-4 font-display text-lg font-bold text-primary shadow-chunky active:translate-y-1 active:shadow-none"
            >
              {done ? (
                <>
                  <CheckCircle2 className="size-5" />
                  Revisar devocional
                </>
              ) : (
                <>
                  <Play className="size-5 fill-current" />
                  Começar devocional
                </>
              )}
            </Link>

            <p className="mt-3 text-center text-[11px] font-bold uppercase tracking-wider opacity-80">
              {done ? "Concluído hoje • bom trabalho" : "≈ 5 min • guiado passo a passo"}
            </p>
          </div>
        </section>

        {/* Reminder discreto, sem decisões na home */}
        <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-muted-foreground">
          <Sparkles className="size-3.5 text-gold" />
          Um devocional por dia, sem pressa.
        </p>

        <p className="mt-3 text-center text-[11px] italic text-muted-foreground px-6">
          "Lâmpada para os meus pés é a tua palavra, e luz para o meu caminho." — Salmo 119:105
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
