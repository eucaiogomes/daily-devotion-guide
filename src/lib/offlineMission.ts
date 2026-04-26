const COMPLETIONS_KEY = "lumen:offline-mission-completions";
const SETTINGS_KEY = "lumen:reminder-settings";

export type OfflineMission = {
  day: number;
  completedOn: string;
  xp: number;
  synced: boolean;
};

export type ReminderSettings = {
  enabled: boolean;
  time: string;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getOfflineCompletions() {
  return readJson<OfflineMission[]>(COMPLETIONS_KEY, []);
}

export function isMissionCompletedToday(day: number) {
  return getOfflineCompletions().some((item) => item.day === day && item.completedOn === todayKey());
}

export function saveOfflineMission(day: number, xp = 30) {
  const completedOn = todayKey();
  const current = getOfflineCompletions();
  const withoutDuplicate = current.filter((item) => !(item.day === day && item.completedOn === completedOn));
  const mission: OfflineMission = { day, completedOn, xp, synced: false };
  writeJson(COMPLETIONS_KEY, [mission, ...withoutDuplicate].slice(0, 365));
  return mission;
}

export function getReminderSettings() {
  return readJson<ReminderSettings>(SETTINGS_KEY, { enabled: false, time: "08:00" });
}

export function saveReminderSettings(settings: ReminderSettings) {
  writeJson(SETTINGS_KEY, settings);
}

export async function syncOfflineMissions() {
  const completions = getOfflineCompletions();
  const pending = completions.filter((item) => !item.synced);
  if (!pending.length || typeof navigator !== "undefined" && !navigator.onLine) return { synced: 0, pending: pending.length };
  if (typeof window === "undefined") return { synced: 0, pending: pending.length };

  const { supabase } = await import("@/integrations/supabase/client");

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user || user.is_anonymous) return { synced: 0, pending: pending.length };

  let synced = 0;
  const next = [...completions];

  for (const item of pending) {
    const { error } = await supabase.from("mission_completions").upsert(
      {
        user_id: user.id,
        day: item.day,
        completed_on: item.completedOn,
        xp: item.xp,
        source: "offline-sync",
      },
      { onConflict: "user_id,completed_on" },
    );

    if (!error) {
      synced += 1;
      const idx = next.findIndex((entry) => entry.day === item.day && entry.completedOn === item.completedOn);
      if (idx >= 0) next[idx] = { ...next[idx], synced: true };
    }
  }

  writeJson(COMPLETIONS_KEY, next);
  return { synced, pending: Math.max(0, pending.length - synced) };
}
