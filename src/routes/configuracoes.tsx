import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import {
  disableDailyReminder,
  registerForPushNotifications,
  scheduleDailyReminder,
} from "@/lib/nativeNotifications";
import {
  getReminderSettings,
  saveReminderSettings,
  syncOfflineMissions,
} from "@/lib/offlineMission";
import { Bell, CheckCircle2, WifiOff } from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Lumen" },
      { name: "description", content: "Ajuste lembrete diário e preferências do Lumen." },
    ],
  }),
  component: ConfigPage,
});

function ConfigPage() {
  const [online, setOnline] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("08:00");
  const [message, setMessage] = useState("Configure quando quer ser lembrado do devocional.");

  useEffect(() => {
    const settings = getReminderSettings();
    setReminderEnabled(settings.enabled);
    setReminderTime(settings.time);
    setOnline(typeof navigator === "undefined" ? true : navigator.onLine);

    const onOnline = () => {
      setOnline(true);
      syncOfflineMissions().then((result) => {
        if (result.synced > 0) setMessage("Progresso offline sincronizado com sua conta.");
      });
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    syncOfflineMissions().catch(() => undefined);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const toggleReminder = async () => {
    if (reminderEnabled) {
      await disableDailyReminder();
      setReminderEnabled(false);
      saveReminderSettings({ enabled: false, time: reminderTime });
      setMessage("Lembrete diário desativado.");
      return;
    }

    await scheduleDailyReminder(reminderTime);
    const push = await registerForPushNotifications();
    setReminderEnabled(true);
    saveReminderSettings({ enabled: true, time: reminderTime });
    setMessage(
      push.registered
        ? "Lembrete e push ativados para este dispositivo."
        : "Lembrete local ativado. Push completo será finalizado no app nativo publicado.",
    );
  };

  return (
    <div className="min-h-screen bg-gradient-sky pb-28">
      <AppHeader streak={3} gold={42} hearts={5} />

      <main className="mx-auto max-w-md px-5 pt-6 space-y-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Preferências
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight">Configurações</h1>
        </header>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Lembrete diário
              </p>
              <h2 className="font-display text-xl font-bold">Não esqueça do devocional</h2>
            </div>
            <div
              className={`flex size-10 items-center justify-center rounded-xl ${
                online ? "bg-success/10 text-success" : "bg-streak/10 text-streak"
              }`}
            >
              {online ? <CheckCircle2 className="size-5" /> : <WifiOff className="size-5" />}
            </div>
          </div>

          <p className="mt-2 text-sm font-semibold text-muted-foreground">{message}</p>

          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <label className="rounded-xl border border-border bg-background px-3 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Horário
              </span>
              <input
                type="time"
                value={reminderTime}
                onChange={(event) => setReminderTime(event.target.value)}
                className="mt-1 w-full bg-transparent font-bold text-foreground outline-none"
              />
            </label>
            <button
              onClick={toggleReminder}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-extrabold shadow-sm active:translate-y-0.5 ${
                reminderEnabled
                  ? "bg-success text-success-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              <Bell className="size-4" />
              {reminderEnabled ? "Ativo" : "Ativar"}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Sobre
          </p>
          <h2 className="font-display text-xl font-bold">Lumen</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Aprenda inglês em 365 dias com um devocional guiado por dia. Vocabulário,
            pronúncia, louvor e oração — sem decisões, só seguir o caminho.
          </p>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
