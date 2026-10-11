import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, LinearTransition, ZoomIn, ZoomOut, useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { palette } from "@/constants/palette";
import type { Board as BoardModel, Move, Position, Side } from "@/lib/game/engine";
import { CrownGlyph } from "./crown";

interface DraughtsBoardProps {
  board: BoardModel;
  selected: Position | null;
  moves: Move[];
  lastMove?: Move | null;
  lastMoveId?: number;
  promotionSquare?: Position | null;
  disabled?: boolean;
  localPlayers?: boolean;
  onCell: (position: Position) => void;
}

const same = (a: Position, b: Position) => a.row === b.row && a.col === b.col;

function TapRipple({ reducedMotion }: { reducedMotion: boolean }) {
  const scale = useSharedValue(reducedMotion ? 1 : 0.38);
  const opacity = useSharedValue(reducedMotion ? 0 : 0.46);
  const motion = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (reducedMotion) return;
    scale.value = withTiming(1.42, { duration: 250 });
    opacity.value = withSequence(withTiming(0.5, { duration: 35 }), withTiming(0, { duration: 235 }));
  }, [opacity, reducedMotion, scale]);

  return <Animated.View pointerEvents="none" style={[styles.tapRipple, motion]} />;
}

function CaptureBurst({ reducedMotion }: { reducedMotion: boolean }) {
  const scale = useSharedValue(reducedMotion ? 1 : 0.45);
  const opacity = useSharedValue(reducedMotion ? 0 : 0.95);
  const motion = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: scale.value }] }));

  useEffect(() => {
    if (reducedMotion) return;
    scale.value = withSequence(withSpring(1.25, { damping: 8, stiffness: 230 }), withTiming(0.86, { duration: 150 }));
    opacity.value = withSequence(withTiming(0.95, { duration: 50 }), withTiming(0, { duration: 330 }));
  }, [opacity, reducedMotion, scale]);

  return <Animated.View pointerEvents="none" style={[styles.captureBurst, motion]}><Text style={styles.captureSpark}>✦</Text></Animated.View>;
}

function Seed({ side, king, selected, promoted, reducedMotion }: { side: Side; king: boolean; selected: boolean; promoted: boolean; reducedMotion: boolean }) {
  const player = side === "player";
  const scale = useSharedValue(king ? 1.04 : 1);
  const glow = useSharedValue(0);
  const selectedMotion = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: 0.22 + glow.value * 0.56,
    shadowRadius: 2.5 + glow.value * 8,
    elevation: 2 + glow.value * 5,
  }));

  useEffect(() => {
    const baseScale = selected ? 1.13 : king ? 1.045 : 1;
    const baseGlow = king ? selected ? 0.82 : 0.42 : 0;
    scale.value = reducedMotion ? (selected ? 1.08 : king ? 1.04 : 1) : withSpring(baseScale, { damping: 10, stiffness: 245, mass: 0.68 });
    if (!promoted) glow.value = reducedMotion ? baseGlow : withSpring(baseGlow, { damping: 14, stiffness: 170 });
  }, [glow, king, promoted, reducedMotion, scale, selected]);

  useEffect(() => {
    if (!promoted) return;
    if (reducedMotion) {
      scale.value = selected ? 1.08 : 1.04;
      glow.value = 0.55;
      return;
    }
    scale.value = withSequence(withSpring(1.38, { damping: 7, stiffness: 260 }), withSpring(selected ? 1.13 : 1.045, { damping: 11, stiffness: 210 }));
    glow.value = withSequence(withTiming(1, { duration: 90 }), withTiming(0.48, { duration: 520 }));
  }, [glow, promoted, reducedMotion, scale, selected]);

  return (
    <Animated.View
      entering={reducedMotion ? undefined : FadeIn.duration(140)}
      exiting={reducedMotion ? undefined : ZoomOut.duration(150)}
      layout={reducedMotion ? undefined : LinearTransition.springify().damping(16).stiffness(190)}
      style={[styles.seedOuter, player ? styles.playerSeed : styles.opponentSeed, king && styles.kingSeed, selected && styles.seedSelected, selectedMotion]}
    >
      <View style={[styles.seedInner, player ? styles.playerInner : styles.opponentInner, king && styles.kingInner]}>
        {king ? <CrownGlyph size={22} /> : <View style={[styles.seedDot, player ? styles.playerDot : styles.opponentDot]} />}
      </View>
    </Animated.View>
  );
}

export function DraughtsBoard({ board, selected, moves, lastMove, lastMoveId, promotionSquare = null, disabled = false, localPlayers = false, onCell }: DraughtsBoardProps) {
  const reducedMotion = useReducedMotion();
  const [tapPulse, setTapPulse] = useState<{ key: string; token: number } | null>(null);
  const tapToken = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const targetKeys = new Set(moves.filter((move) => selected && same(move.from, selected)).map((move) => `${move.to.row}-${move.to.col}`));
  const capturedKeys = new Set(moves.filter((move) => selected && same(move.from, selected)).flatMap((move) => move.captured.map((p) => `${p.row}-${p.col}`)));
  const lastPathKeys = new Set(lastMove?.path.map((p) => `${p.row}-${p.col}`) ?? []);
  const lastCapturedKeys = new Set(lastMove?.captured.map((p) => `${p.row}-${p.col}`) ?? []);

  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  const pulseTap = (key: string) => {
    if (reducedMotion) return;
    const token = ++tapToken.current;
    setTapPulse({ key, token });
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      setTapPulse((current) => current?.token === token ? null : current);
    }, 310);
  };

  return (
    <View style={styles.boardFrame} accessibilityLabel="10 by 10 Nigerian Draughts board">
      <View style={styles.board}>
        {board.map((row, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {row.map((piece, colIndex) => {
              const key = `${rowIndex}-${colIndex}`;
              const dark = (rowIndex + colIndex) % 2 === 1;
              const position = { row: rowIndex, col: colIndex };
              const isSelected = Boolean(selected && same(position, selected));
              const isTarget = targetKeys.has(key);
              const wasCaptured = capturedKeys.has(key);
              const inLastPath = lastPathKeys.has(key);
              const justPromoted = Boolean(piece?.king && promotionSquare && same(position, promotionSquare));
              return (
                <Pressable
                  key={key}
                  onPressIn={() => pulseTap(key)}
                  onPress={() => onCell(position)}
                  disabled={disabled}
                  accessibilityRole="button"
                  accessibilityLabel={`${String.fromCharCode(65 + colIndex)}${10 - rowIndex}${piece ? `, ${localPlayers ? `Player ${piece.side === "player" ? "1" : "2"}` : piece.side === "player" ? "your" : "opponent"} ${piece.king ? "king" : "seed"}` : ""}${isTarget ? ", legal move" : ""}`}
                  style={[styles.square, dark ? styles.darkSquare : styles.lightSquare, isSelected && styles.selectedSquare, inLastPath && styles.lastMoveSquare]}
                >
                  {tapPulse?.key === key ? <TapRipple key={tapPulse.token} reducedMotion={reducedMotion} /> : null}
                  {wasCaptured ? <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(80)} style={styles.captureRing} /> : null}
                  {isTarget ? <Animated.View entering={reducedMotion ? undefined : ZoomIn.duration(150).springify()} style={[styles.targetDot, dark ? styles.targetDotDark : styles.targetDotLight, moves.some((move) => selected && same(move.from, selected) && same(move.to, position) && move.isCapture) && styles.targetCapture]} /> : null}
                  {lastCapturedKeys.has(key) ? <CaptureBurst key={`${lastMoveId ?? "move"}-${key}`} reducedMotion={reducedMotion} /> : null}
                  {piece ? <Seed side={piece.side} king={piece.king} selected={isSelected} promoted={justPromoted} reducedMotion={reducedMotion} /> : null}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <View pointerEvents="none" style={styles.coordinatesLeft}><Text style={styles.coordText}>10</Text><Text style={styles.coordText}>5</Text><Text style={styles.coordText}>1</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  boardFrame: { alignSelf: "center", width: "100%", aspectRatio: 1, maxWidth: 460, padding: 7, borderRadius: 20, backgroundColor: "#A47A43", borderColor: "#E3B465", borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.22, shadowRadius: 18, elevation: 7 },
  board: { flex: 1, overflow: "hidden", borderRadius: 13 },
  row: { flex: 1, flexDirection: "row" },
  square: { flex: 1, aspectRatio: 1, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 0.35, borderColor: "rgba(17,37,31,0.16)" },
  darkSquare: { backgroundColor: palette.boardDark },
  lightSquare: { backgroundColor: palette.boardLight },
  selectedSquare: { borderWidth: 2.1, borderColor: palette.goldLight, zIndex: 1 },
  lastMoveSquare: { backgroundColor: "#376352" },
  tapRipple: { position: "absolute", width: "70%", height: "70%", borderRadius: 999, borderWidth: 2, borderColor: "#FFE19A", backgroundColor: "rgba(255,216,117,0.12)" },
  seedOuter: { width: "76%", height: "76%", borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1.4, shadowColor: "#0B1713", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 2, elevation: 2 },
  playerSeed: { backgroundColor: palette.playerSeed, borderColor: "#F3D28B" },
  opponentSeed: { backgroundColor: palette.opponentSeed, borderColor: "#91B598" },
  kingSeed: { width: "89%", height: "89%", borderWidth: 2.2, shadowColor: "#FFD267", shadowOpacity: 0.8, shadowRadius: 7, elevation: 6 },
  seedSelected: { borderColor: "#FFF2C8", borderWidth: 2.5 },
  seedInner: { width: "78%", height: "78%", borderRadius: 999, alignItems: "center", justifyContent: "center", borderWidth: 1.1 },
  playerInner: { borderColor: "rgba(117,70,27,0.53)" },
  opponentInner: { borderColor: "rgba(195,223,194,0.7)" },
  kingInner: { width: "86%", height: "86%", backgroundColor: "rgba(255,244,205,0.18)", borderWidth: 1.4, borderColor: "rgba(255,230,162,0.92)" },
  seedDot: { width: "24%", height: "24%", borderRadius: 99 },
  playerDot: { backgroundColor: "#9B642C" },
  opponentDot: { backgroundColor: "#9CC4A3" },
  targetDot: { position: "absolute", width: "29%", height: "29%", borderRadius: 100, borderWidth: 1.5 },
  targetDotDark: { backgroundColor: "rgba(240,189,82,0.72)", borderColor: "#FFF1BF" },
  targetDotLight: { backgroundColor: "rgba(23,59,49,0.38)", borderColor: "#173B31" },
  targetCapture: { width: "49%", height: "49%", backgroundColor: "transparent", borderWidth: 2.2, borderColor: palette.goldLight },
  captureRing: { position: "absolute", width: "82%", height: "82%", borderRadius: 100, borderWidth: 1, borderColor: "rgba(236,150,120,0.78)" },
  captureBurst: { position: "absolute", zIndex: 2, alignItems: "center", justifyContent: "center" },
  captureSpark: { color: "#FFF0B0", fontSize: 20, fontWeight: "900", textShadowColor: "#E58A53", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 },
  coordinatesLeft: { position: "absolute", left: 9, top: 12, bottom: 12, justifyContent: "space-between" },
  coordText: { color: "rgba(246,240,227,0.47)", fontSize: 7, fontWeight: "700" },
});
