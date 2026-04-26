import { Flame, Crown, Heart } from "lucide-react";

interface AppHeaderProps {
  streak: number;
  gold: number;
  hearts: number;
}

export function AppHeader({ streak, gold, hearts }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl font-bold text-primary">Lumen</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold">
            EN
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm font-bold">
          <Stat icon={<Flame className="size-4" />} value={streak} color="text-streak" />
          <Stat icon={<Crown className="size-4" />} value={gold} color="text-gold" />
          <Stat icon={<Heart className="size-4 fill-current" />} value={hearts} color="text-accent" />
        </div>
      </div>
    </header>
  );
}

function Stat({ icon, value, color }: { icon: React.ReactNode; value: number; color: string }) {
  return (
    <div className={`flex items-center gap-1 ${color}`}>
      {icon}
      <span>{value}</span>
    </div>
  );
}
