import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EventSetlist, MusicEvent, Song } from "../types";

// ── Cache keys ────────────────────────────────────────────────────────────────

export const CACHE_EVENTS = "cache:events:v1";
export const CACHE_SONGS = "cache:songs:v1";
export const cacheSetlistKey = (eventId: string) => `cache:setlist:v1:${eventId}`;

// Typed cache entry aliases (kept for import convenience)
export type { EventSetlist, MusicEvent, Song };

// ── Helpers ───────────────────────────────────────────────────────────────────

export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Silently ignore write errors (e.g. storage quota exceeded)
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
