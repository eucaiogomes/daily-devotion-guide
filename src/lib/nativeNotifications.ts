import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import { saveReminderSettings } from "@/lib/offlineMission";

export const isNativeApp = () => Capacitor.isNativePlatform();

function nextReminderDate(time: string) {
  const [hours = "8", minutes = "0"] = time.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  if (date.getTime() <= Date.now()) date.setDate(date.getDate() + 1);
  return date;
}

export async function scheduleDailyReminder(time: string) {
  saveReminderSettings({ enabled: true, time });

  if (!isNativeApp()) {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    return { local: false };
  }

  const permission = await LocalNotifications.requestPermissions();
  if (permission.display !== "granted") return { local: false };

  await LocalNotifications.cancel({ notifications: [{ id: 36501 }] });
  await LocalNotifications.schedule({
    notifications: [
      {
        id: 36501,
        title: "Sua missão Lumen te espera",
        body: "Complete o Salmo do dia e mantenha sua sequência de inglês com fé.",
        schedule: {
          at: nextReminderDate(time),
          repeats: true,
          every: "day",
        },
      },
    ],
  });

  return { local: true };
}

export async function disableDailyReminder() {
  saveReminderSettings({ enabled: false, time: "08:00" });
  if (isNativeApp()) {
    await LocalNotifications.cancel({ notifications: [{ id: 36501 }] });
  }
}

export async function registerForPushNotifications() {
  if (!isNativeApp()) return { registered: false, reason: "native-only" };
  if (typeof window === "undefined") return { registered: false, reason: "server-render" };

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return { registered: false, reason: "permission-denied" };

  await PushNotifications.register();

  return new Promise<{ registered: boolean; token?: string; reason?: string }>((resolve) => {
    const timeout = window.setTimeout(() => resolve({ registered: false, reason: "token-timeout" }), 8000);

    PushNotifications.addListener("registration", async ({ value }) => {
      window.clearTimeout(timeout);
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;

      if (user && !user.is_anonymous) {
        await supabase.from("push_subscriptions").upsert(
          {
            user_id: user.id,
            token: value,
            platform: Capacitor.getPlatform(),
            enabled: true,
          },
          { onConflict: "user_id,token" },
        );
      }

      resolve({ registered: true, token: value });
    });

    PushNotifications.addListener("registrationError", () => {
      window.clearTimeout(timeout);
      resolve({ registered: false, reason: "registration-error" });
    });
  });
}
