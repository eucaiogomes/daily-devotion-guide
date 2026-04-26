import { Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, Mic, Music } from "lucide-react";
import doveMascot from "@/assets/dove-mascot.png";

interface DailyGoalCardProps {
  day: number;
  totalDays: number;
  xp: number;
  goal: number;
  verseRef: string;
  verseEn: string;
  versePt: string;
}

export function DailyGoalCard({ day, totalDays, xp, goal, verseRef, verseEn, versePt }: DailyGoalCardProps) {
  const progress = Math.min(100, (xp / goal) * 100);
  const yearProgress = Math.round((day / totalDays) * 100);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-gradient-hero text-primary-foreground p-5 shadow-soft">
      <div className="absolute -right-5 -bottom-5 opacity-90 animate-float-slow">
        <img src={doveMascot} alt="Mascote pomba Lumen" width={156} height={156} className="size-36" />
      </div>

      <div className="relative pr-24">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-widest opacity-85 font-bold">Dia {day} de {totalDays}</span>
          <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
            {yearProgress}% da jornada
          </span>
        </div>

        <h2 className="font-display text-3xl font-bold mt-2 leading-tight">
          Missão de hoje
        </h2>
        <p className="text-sm mt-2 opacity-95 italic leading-snug">"{verseEn}"</p>
        <p className="text-xs mt-1 opacity-75 leading-snug">{versePt}</p>
        <p className="text-xs mt-2 font-bold opacity-90">— {verseRef}</p>

        <div className="mt-4 grid grid-cols-3 gap-2 max-w-[16rem]">
          <MissionChip icon={<BookOpen className="size-3.5" />} label="Salmo" done />
          <MissionChip icon={<Mic className="size-3.5" />} label="Fala" done={progress >= 60} />
          <MissionChip icon={<Music className="size-3.5" />} label="Louvor" done={progress >= 100} />
        </div>

        <div className="mt-4">
          <div className="h-3 bg-primary-foreground/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-gold rounded-full transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 max-w-[16rem]">
            <p className="text-xs font-bold opacity-90">{xp} / {goal} XP hoje</p>
            <Link
              to="/lesson/$day"
              params={{ day: String(day) }}
              className="rounded-full bg-primary-foreground px-3 py-1 text-xs font-extrabold text-primary shadow-sm active:translate-y-0.5"
            >
              Jogar
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


function MissionChip({ icon, label, done }: { icon: React.ReactNode; label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-center gap-1 rounded-xl bg-primary-foreground/15 px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wide">
      {done ? <CheckCircle2 className="size-3.5 text-gold" /> : icon}
      <span>{label}</span>
    </div>
  );
}
