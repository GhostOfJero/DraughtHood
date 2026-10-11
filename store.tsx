import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PlayerProfile, GameSession } from "@/lib/game/storage";
import { DEFAULT_PROFILE, loadProfile, saveProfile } from "@/lib/game/storage";
import { buildMatchReport, type MatchReport, type MatchResult } from "@/lib/game/stats";

interface GameStoreValue {
  profile: PlayerProfile;
  loaded: boolean;
  setSession: (session: GameSession | null) => void;
  toggleSound: () => void;
  finishSession: (session: GameSession, result: MatchResult, report?: MatchReport) => void;
  clearRecords: () => void;
}

const REPORT_HISTORY_LIMIT = 250;
const GameStoreContext = createContext<GameStoreValue | null>(null);

export function GameStoreProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadProfile().then((value) => {
      if (alive) {
        setProfile(value);
        setLoaded(true);
      }
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (loaded) void saveProfile(profile);
  }, [loaded, profile]);

  const setSession = useCallback((activeSession: GameSession | null) => {
    setProfile((current) => ({ ...current, activeSession }));
  }, []);

  const toggleSound = useCallback(() => {
    setProfile((current) => ({ ...current, soundEnabled: !current.soundEnabled }));
  }, []);

  const finishSession = useCallback((session: GameSession, result: MatchResult, suppliedReport?: MatchReport) => {
    const report = suppliedReport ?? buildMatchReport(session, result);
    setProfile((current) => {
      const won = result === "win";
      const completed = session.mode === "challenge" && session.challengeId && won
        ? Array.from(new Set([...current.completedChallenges, session.challengeId]))
        : current.completedChallenges;
      const streak = won ? current.currentStreak + 1 : 0;
      return {
        ...current,
        gamesPlayed: current.gamesPlayed + 1,
        wins: current.wins + (won ? 1 : 0),
        currentStreak: streak,
        bestStreak: Math.max(current.bestStreak, streak),
        captures: current.captures + report.capturesPlayer + report.capturesOpponent,
        completedChallenges: completed,
        matchReports: [report, ...current.matchReports].slice(0, REPORT_HISTORY_LIMIT),
        activeSession: null,
      };
    });
  }, []);

  const clearRecords = useCallback(() => {
    setProfile((current) => ({
      ...DEFAULT_PROFILE,
      soundEnabled: current.soundEnabled,
      activeSession: current.activeSession,
    }));
  }, []);

  const value = useMemo(() => ({ profile, loaded, setSession, toggleSound, finishSession, clearRecords }), [
    profile, loaded, setSession, toggleSound, finishSession, clearRecords,
  ]);

  return <GameStoreContext.Provider value={value}>{children}</GameStoreContext.Provider>;
}

export function useGameStore(): GameStoreValue {
  const value = useContext(GameStoreContext);
  if (!value) throw new Error("useGameStore must be used inside GameStoreProvider");
  return value;
}
