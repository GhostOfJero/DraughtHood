import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Difficulty } from "@/lib/game/ai";
import type { GameState } from "@/lib/game/engine";
import type { GameMode } from "@/lib/game/mode";
import type { MatchReport } from "@/lib/game/stats";

const STORAGE_KEY = "eagle-draft.profile.v1";

export interface GameSession {
  game: GameState;
  history: GameState[];
  mode: GameMode;
  difficulty: Difficulty;
  challengeId?: string;
  playerTurns: number;
  startedAt: number;
}

export interface PlayerProfile {
  gamesPlayed: number;
  wins: number;
  currentStreak: number;
  bestStreak: number;
  captures: number;
  completedChallenges: string[];
  matchReports: MatchReport[];
  soundEnabled: boolean;
  activeSession: GameSession | null;
}

export const DEFAULT_PROFILE: PlayerProfile = {
  gamesPlayed: 0,
  wins: 0,
  currentStreak: 0,
  bestStreak: 0,
  captures: 0,
  completedChallenges: [],
  matchReports: [],
  soundEnabled: true,
  activeSession: null,
};

export async function loadProfile(): Promise<PlayerProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    const storedSession = parsed.activeSession;
    const normalizedMode: GameMode = storedSession?.mode === "local" || storedSession?.mode === "challenge"
      ? storedSession.mode
      : "classic";
    const activeSession: GameSession | null = storedSession
      ? {
          ...storedSession,
          mode: normalizedMode,
          startedAt: Number.isFinite(storedSession.startedAt) && storedSession.startedAt > 0
            ? storedSession.startedAt
            : Date.now(),
        }
      : null;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      completedChallenges: Array.isArray(parsed.completedChallenges) ? parsed.completedChallenges : [],
      matchReports: Array.isArray(parsed.matchReports) ? parsed.matchReports : [],
      activeSession,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: PlayerProfile): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Gameplay remains available if device storage is temporarily unavailable.
  }
}
