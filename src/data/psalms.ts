/**
 * Trilha de 365 dias de aprendizado de inglês com os Salmos.
 * Combina 30 salmos curados (PSALM_BANK) ciclados pela trilha,
 * com variações no versículo memorizado para que cada dia tenha
 * uma combinação única de exercícios.
 */
import { PSALM_BANK } from "./psalmsBank";
import type { CuratedPsalm, PsalmLesson } from "./psalms.types";

export type { PsalmLesson, PsalmVerse, PsalmKeyword } from "./psalms.types";

export const TOTAL_DAYS = 365;

/** Build the day's lesson by cycling through the bank.
 *  Each "lap" rotates the memory verse so dia 1, 31, 61... do not repeat. */
function buildLesson(day: number): PsalmLesson {
  const idx = (day - 1) % PSALM_BANK.length;
  const lap = Math.floor((day - 1) / PSALM_BANK.length);
  const base: CuratedPsalm = PSALM_BANK[idx];

  // Pick a different memory verse on each lap so subsequent visits feel fresh.
  const mvIndex = lap % base.verses.length;
  const mvVerse = base.verses[mvIndex];
  const memoryVerse = lap === 0
    ? base.memoryVerse
    : { en: mvVerse.en, pt: mvVerse.pt, ref: mvVerse.ref };

  // On laps > 0 add a "Revisão" suffix so the user knows it's a review day.
  const title = lap === 0 ? base.title : `${base.title} • Revisão ${lap}`;

  return {
    ...base,
    day,
    slug: lap === 0 ? `psalm-${base.psalm}` : `psalm-${base.psalm}-r${lap}`,
    title,
    memoryVerse,
  };
}

/** All 365 lessons, generated once at module load. */
export const PSALMS: PsalmLesson[] = Array.from({ length: TOTAL_DAYS }, (_, i) => buildLesson(i + 1));

export function getPsalmByDay(day: number): PsalmLesson {
  const safe = Math.min(Math.max(1, day), TOTAL_DAYS);
  return PSALMS[safe - 1];
}

export function getPsalmBySlug(slug: string): PsalmLesson | undefined {
  return PSALMS.find((p) => p.slug === slug);
}

/** Group lessons into chapters of 30 days for the home journey. */
export interface Chapter {
  number: number;
  title: string;
  lessons: PsalmLesson[];
}

export function getChapters(): Chapter[] {
  const CHAPTER_SIZE = 30;
  const chapters: Chapter[] = [];
  for (let i = 0; i < PSALMS.length; i += CHAPTER_SIZE) {
    const slice = PSALMS.slice(i, i + CHAPTER_SIZE);
    const number = chapters.length + 1;
    chapters.push({
      number,
      title: number === 1 ? "Primeiros Passos" : `Capítulo ${number}`,
      lessons: slice,
    });
  }
  return chapters;
}
