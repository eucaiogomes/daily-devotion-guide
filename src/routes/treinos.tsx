import { createFileRoute } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { GameModeHub } from "@/components/GameModeHub";

export const Route = createFileRoute("/treinos")({
  head: () => ({
    meta: [
      { title: "Treinos — Lumen" },
      {
        name: "description",
        content: "Pratique inglês com modos extras: Match Rush, Karaokê, Pareamento e mais.",
      },
    ],
  }),
  component: TreinosPage,
});

function TreinosPage() {
  return (
    <div className="min-h-screen bg-gradient-sky pb-28">
      <AppHeader streak={3} gold={42} hearts={5} />

      <main className="mx-auto max-w-md px-5 pt-6 space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Prática extra
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight">Treinos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Já fez seu devocional? Reforce vocabulário e pronúncia com mini-jogos.
          </p>
        </header>

        <GameModeHub />
      </main>

      <BottomNav />
    </div>
  );
}
