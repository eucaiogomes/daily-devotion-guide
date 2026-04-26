/**
 * Tipos compartilhados para a biblioteca de Salmos.
 */

export interface PsalmVerse {
  ref: string;
  en: string;
  pt: string;
  vocab?: Record<string, string>;
}

export interface PsalmKeyword {
  en: string;
  pt: string;
  ipa?: string;
  example?: string;
}

export interface PsalmLesson {
  day: number;
  slug: string;
  psalm: number;
  title: string;
  subtitle: string;
  theme: string;
  emoji: string;
  keywords: PsalmKeyword[];
  verses: PsalmVerse[];
  memoryVerse: { en: string; pt: string; ref: string };
}

/** A curated psalm without day/slug — those are assigned by the generator. */
export type CuratedPsalm = Omit<PsalmLesson, "day" | "slug">;
