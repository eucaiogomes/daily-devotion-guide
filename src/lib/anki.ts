/**
 * Repetição espaçada estilo Anki (algoritmo SM-2 simplificado) para versículos.
 * Persiste o estado de cada cartão no localStorage por chave estável (Salmo:capítulo).
 */

const STATE_KEY = "lumen:anki-verse-state-v1";

/** Avaliação que o usuário dá ao revisar um cartão. */
export type AnkiGrade = "again" | "hard" | "good" | "easy";

export interface AnkiCardState {
  /** chave estável do cartão (ex.: ref do versículo) */
  id: string;
  /** quantidade de revisões bem-sucedidas em sequência */
  reps: number;
  /** intervalo até a próxima revisão (em dias) */
  intervalDays: number;
  /** "facilidade" — quanto maior, mais espaçado fica */
  ease: number;
  /** próxima data devida (ISO yyyy-mm-dd) */
  due: string;
  /** última revisão (ISO) — usado só para estatísticas */
  lastReviewed?: string;
}

const todayKey = () => new Date().toISOString().slice(0, 10);

function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00");
  d.setDate(d.getDate() + Math.max(0, Math.round(days)));
  return d.toISOString().slice(0, 10);
}

function readAll(): Record<string, AnkiCardState> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, AnkiCardState>) : {};
  } catch {
    return {};
  }
}

function writeAll(state: Record<string, AnkiCardState>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

/** Cria estado inicial — cartão novo é devido hoje. */
export function newCard(id: string): AnkiCardState {
  return { id, reps: 0, intervalDays: 0, ease: 2.5, due: todayKey() };
}

export function getCardState(id: string): AnkiCardState {
  const all = readAll();
  return all[id] ?? newCard(id);
}

export function getAllStates(): Record<string, AnkiCardState> {
  return readAll();
}

/** SM-2 simplificado: ajusta ease e intervalo conforme a nota. */
export function applyGrade(card: AnkiCardState, grade: AnkiGrade): AnkiCardState {
  const today = todayKey();
  let { reps, intervalDays, ease } = card;

  if (grade === "again") {
    // Errou: zera repetições, cai a facilidade, revisar de novo hoje.
    reps = 0;
    intervalDays = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    // Acertou em algum nível.
    if (reps === 0) {
      intervalDays = grade === "easy" ? 4 : grade === "good" ? 1 : 1;
    } else if (reps === 1) {
      intervalDays = grade === "easy" ? 7 : grade === "good" ? 3 : 2;
    } else {
      const factor = grade === "easy" ? ease * 1.3 : grade === "good" ? ease : 1.2;
      intervalDays = Math.round(intervalDays * factor);
    }

    if (grade === "hard") ease = Math.max(1.3, ease - 0.15);
    else if (grade === "easy") ease = ease + 0.15;
    // "good" mantém a facilidade.

    reps = reps + 1;
  }

  const next: AnkiCardState = {
    ...card,
    reps,
    intervalDays,
    ease,
    due: grade === "again" ? today : addDays(today, intervalDays),
    lastReviewed: today,
  };

  const all = readAll();
  all[card.id] = next;
  writeAll(all);
  return next;
}

/** Filtra ids que estão devidos hoje (ou novos). */
export function filterDue(ids: string[], date = todayKey()): string[] {
  const all = readAll();
  return ids.filter((id) => {
    const c = all[id];
    return !c || c.due <= date;
  });
}

export interface AnkiStats {
  total: number;
  due: number;
  learned: number;
  newCards: number;
}

export function getStats(allIds: string[]): AnkiStats {
  const all = readAll();
  const today = todayKey();
  let due = 0;
  let learned = 0;
  let newCards = 0;
  for (const id of allIds) {
    const c = all[id];
    if (!c) {
      newCards += 1;
      due += 1;
    } else {
      if (c.due <= today) due += 1;
      if (c.reps >= 2) learned += 1;
    }
  }
  return { total: allIds.length, due, learned, newCards };
}
