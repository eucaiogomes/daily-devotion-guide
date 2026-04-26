import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Dumbbell, Settings } from "lucide-react";

const ITEMS = [
  { to: "/", label: "Hoje", icon: Home },
  { to: "/treinos", label: "Treinos", icon: Dumbbell },
  { to: "/configuracoes", label: "Ajustes", icon: Settings },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {ITEMS.map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-extrabold uppercase tracking-wider transition ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <Icon className={`size-5 ${active ? "stroke-[2.5]" : ""}`} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
