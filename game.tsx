import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, { ZoomIn, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import { Badge, Button, Card, Eyebrow, Screen } from "@/components/game/ui";
import { DraughtsBoard } from "@/components/game/board";
import { CrownGlyph } from "@/components/game/crown";
import { palette } from "@/constants/palette";
import { chooseComputerMove, type Difficulty } from "@/lib/game/ai";
import { challengeProgress, createChallengeState, getChallenge, getNextChallenge, isChallengeComplete, isChallengeFailed, isChallengeUnlocked } from "@/lib/game/challenges";
import { applyMove, countPieces, createInitialState, getLegalMoves, moveKey, positionLabel, samePosition, type Move, type Position, type Side } from "@/lib/game/engine";
import { useGameStore } from "@/lib/game/store";
import type { GameSession } from "@/lib/game/storage";
import { isHumanControlled, nameForSide } from "@/lib/game/mode";
import { buildMatchReport, formatDuration, type MatchReport, type MatchResult } from "@/lib/game/stats";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const asString = (value: string | string[] | undefined): string | undefined => Array.isArray(value) ? value[0] : value;
const difficultyNames: Record<Difficulty, string> = { relaxed: "Relaxed", club: "Club", champion: "Champion" };

function newSession(difficulty: Difficulty, challengeId?: string, mode: "classic" | "local" = "classic"): GameSession {
  const challenge = getChallenge(challengeId);
  return {
    game: challengeId ? createChallengeState(challengeId) : createInitialState(),
    history: [],
    mode: challenge ? "challenge" : mode,
    difficulty: challenge?.difficulty ?? difficulty,
    challengeId: challenge?.id,
    playerTurns: 0,
    startedAt: Date.now(),
  };
}

export default function GameScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string; challengeId?: string; difficulty?: string }>();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const { profile, loaded, setSession: saveSession, finishSession, toggleSound } = useGameStore();
  const [session, setSessionLocal] = useState<GameSession | null>(null);
  const [selected, setSelected] = useState<Position | null>(null);
  const [paused, setPaused] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [routeChoices, setRouteChoices] = useState<Move[] | null>(null);
  const [matchReport, setMatchReport] = useState<MatchReport | null>(null);
  const [handoffSide, setHandoffSide] = useState<Side | null>(null);
  const initializedKey = useRef<string | null>(null);
  const recordedResult = useRef(false);
  const moveSound = useAudioPlayer(require("../assets/audio/tap.wav"));

  const modeParam = asString(params.mode);
  const challengeId = asString(params.challengeId);
  const difficultyParam = asString(params.difficulty);
  const routeKey = `${modeParam ?? ""}|${challengeId ?? ""}|${difficultyParam ?? ""}`;
  const difficulty: Difficulty = difficultyParam === "relaxed" || difficultyParam === "champion" ? difficultyParam : "club";

  useEffect(() => {
    if (!loaded || initializedKey.current === routeKey) return;
    if (challengeId && !isChallengeUnlocked(challengeId, profile.completedChallenges)) {
      initializedKey.current = routeKey;
      router.replace("/challenges");
      return;
    }
    initializedKey.current = routeKey;
    const next = challengeId
      ? newSession(difficulty, challengeId)
      : modeParam === "local"
        ? newSession(difficulty, undefined, "local")
        : modeParam
          ? newSession(difficulty)
          : profile.activeSession ?? newSession(difficulty);
    recordedResult.current = false;
    setSessionLocal(next);
    setMatchReport(null);
    setHandoffSide(next.mode === "local" && next.game.status === "playing" ? next.game.turn : null);
    saveSession(next);
  }, [loaded, routeKey, challengeId, modeParam, difficulty, profile.activeSession, profile.completedChallenges, router, saveSession]);

  const challenge = session?.challengeId ? getChallenge(session.challengeId) : undefined;
  const nextChallenge = getNextChallenge(profile.completedChallenges);
  const game = session?.game;
  const localMatch = session?.mode === "local";
  const objectiveComplete = Boolean(session && challenge && isChallengeComplete(challenge, session.game, session.playerTurns));
  const challengeFailed = Boolean(session && challenge && isChallengeFailed(challenge, session.game, session.playerTurns));
  const finished = Boolean(game && (game.status === "finished" || objectiveComplete || challengeFailed));
  const playerWon = Boolean(game && (challenge ? objectiveComplete : game.winner === "player"));
  const outcomeIsWin = localMatch ? Boolean(game?.winner) : playerWon;
  const canControlTurn = Boolean(game && session && isHumanControlled(session.mode, game.turn));
  const legalMoves = useMemo(() => game && session && isHumanControlled(session.mode, game.turn) ? getLegalMoves(game) : [], [game, session?.mode]);
  const selectedMoves = selected ? legalMoves.filter((move) => samePosition(move.from, selected)) : [];
  const boardSize = Math.min(Math.max(width - 40, 280), 460);
  const remainingPlayer = game ? countPieces(game.board, "player") : 0;
  const remainingOpponent = game ? countPieces(game.board, "opponent") : 0;
  const objectiveProgress = challenge && session ? challengeProgress(challenge, session.game, session.playerTurns) : 0;
  const reportResult: MatchResult = playerWon ? "win" : challengeFailed || session?.game.winner === "opponent" ? "loss" : "draw";
  const pendingReport = useMemo(() => finished && session ? buildMatchReport(session, reportResult) : null, [finished, session, reportResult]);
  const displayedReport = matchReport ?? pendingReport;

  useEffect(() => {
    if (!session || !finished || !pendingReport || recordedResult.current) return;
    recordedResult.current = true;
    setMatchReport(pendingReport);
    finishSession(session, reportResult, pendingReport);
  }, [session, finished, pendingReport, reportResult, finishSession]);

  useEffect(() => {
    if (!session || session.mode === "local" || !game || !loaded || finished || paused || game.status !== "playing" || game.turn !== "opponent") return;
    const timer = setTimeout(() => {
      const move = chooseComputerMove(game, session.difficulty);
      if (!move) return;
      const next: GameSession = { ...session, history: [...session.history, game], game: applyMove(game, move) };
      setSessionLocal(next);
      saveSession(next);
      setSelected(null);
      if (profile.soundEnabled) { try { moveSound.play(); } catch { /* Audio may be unavailable on some devices. */ } }
      void Haptics.impactAsync(move.isCapture ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }, 440);
    return () => clearTimeout(timer);
  }, [session, game, loaded, finished, paused, profile.soundEnabled, moveSound, saveSession]);

  const replaceSession = (next: GameSession) => {
    setSessionLocal(next);
    saveSession(next);
    setSelected(null);
    setRouteChoices(null);
    setMatchReport(null);
    setHandoffSide(next.mode === "local" && next.game.status === "playing" ? next.game.turn : null);
    recordedResult.current = false;
  };

  const playCurrentMove = (move: Move) => {
    if (!session || !game || !isHumanControlled(session.mode, game.turn)) return;
    const nextGame = applyMove(game, move);
    const playerTurns = session.mode === "local" ? session.playerTurns : session.playerTurns + 1;
    const next: GameSession = { ...session, history: [...session.history, game], game: nextGame, playerTurns };
    replaceSession(next);
    if (profile.soundEnabled) { try { moveSound.play(); } catch { /* Audio may be unavailable on some devices. */ } }
    void Haptics.impactAsync(move.isCapture ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  };

  const startFresh = () => {
    if (!session) return;
    const next = newSession(session.difficulty, session.challengeId, session.mode === "local" ? "local" : "classic");
    setPaused(false);
    replaceSession(next);
  };

  const onCell = (position: Position) => {
    if (!session || !game || !isHumanControlled(session.mode, game.turn) || finished || paused || handoffSide !== null) return;
    const activeSide = session.mode === "local" ? game.turn : "player";
    const piece = game.board[position.row][position.col];
    if (selected) {
      const matching = selectedMoves.filter((move) => samePosition(move.to, position));
      if (matching.length > 1) {
        setRouteChoices(matching);
        return;
      }
      if (matching.length === 1) {
        playCurrentMove(matching[0]);
        return;
      }
      if (piece?.side === activeSide) {
        const canMove = legalMoves.some((move) => samePosition(move.from, position));
        setSelected(canMove ? position : null);
        void Haptics.selectionAsync().catch(() => undefined);
        return;
      }
      setSelected(null);
      return;
    }
    if (piece?.side === activeSide && legalMoves.some((move) => samePosition(move.from, position))) {
      setSelected(position);
      void Haptics.selectionAsync().catch(() => undefined);
    }
  };

  const undoTurn = () => {
    if (!session || !isHumanControlled(session.mode, session.game.turn) || finished) return;
    const undoPlies = session.mode === "local" ? 1 : 2;
    if (session.history.length < undoPlies) return;
    const previous = session.history[session.history.length - undoPlies];
    const next: GameSession = {
      ...session,
      game: previous,
      history: session.history.slice(0, -undoPlies),
      playerTurns: Math.max(0, session.playerTurns - (session.mode === "local" ? 0 : 1)),
    };
    replaceSession(next);
  };

  if (!loaded || !session || !game) {
    return <Screen><View style={styles.loading}><Text style={styles.loadingText}>Setting the board…</Text></View></Screen>;
  }

  const winnerName = game.winner ? nameForSide(session.mode, game.winner) : null;
  const activePlayerName = nameForSide(session.mode, game.turn);
  const upperPlayerName = nameForSide(session.mode, "opponent");
  const lowerPlayerName = nameForSide(session.mode, "player");
  const undoPlies = session.mode === "local" ? 1 : 2;
  const statusText = finished
    ? localMatch ? `${winnerName ?? "A player"} wins` : playerWon ? "Round won" : "Round over"
    : localMatch ? `${activePlayerName}'s turn`
      : game.turn === "player" ? "Your turn" : `${difficultyNames[session.difficulty]} is thinking…`;
  const lastEventText = game.lastEvent === "capture" ? "Seed captured" : game.lastEvent === "promotion" ? "A new crown is yours" : game.lastEvent === "win" ? "The board is yours" : "Tap a seed to see legal moves";

  return (
    <Screen contentStyle={[styles.content, { paddingBottom: 22 }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back to home" style={styles.backButton}><Ionicons name="chevron-back" size={21} color={palette.ivory} /></Pressable>
        <View style={styles.topTitle}><Eyebrow>{challenge ? "CHALLENGE · " + challenge.category.toUpperCase() : localMatch ? "LOCAL · PASS & PLAY" : "CLASSIC MATCH"}</Eyebrow><Text style={styles.topHeading}>{challenge?.title ?? "The board"}</Text></View>
        <Pressable onPress={() => setPaused(true)} accessibilityRole="button" accessibilityLabel="Pause game" style={styles.backButton}><Ionicons name="pause" size={19} color={palette.ivory} /></Pressable>
      </View>

      <View style={styles.playerStrip}>
        <View style={[styles.playerToken, styles.cpuToken, game.turn === "opponent" && !finished && styles.playerTokenActive]}><Text style={[styles.playerTokenLetter, localMatch && styles.localTokenLetter]}>{localMatch ? "P2" : "E"}</Text></View>
        <View style={styles.playerInfo}><Text style={styles.playerName}>{upperPlayerName}</Text><Text style={styles.playerMeta}>{localMatch ? "Pass & play" : difficultyNames[session.difficulty]} · {remainingOpponent} seeds</Text></View>
        <View style={styles.vsPill}><Text style={styles.vsText}>VS</Text></View>
        <View style={[styles.playerToken, styles.humanToken, game.turn === "player" && !finished && styles.playerTokenActive]}><Text style={[styles.playerTokenLetter, localMatch && styles.localTokenLetter]}>{localMatch ? "P1" : "Y"}</Text></View>
        <View style={[styles.playerInfo, styles.playerInfoRight]}><Text style={styles.playerName}>{lowerPlayerName}</Text><Text style={styles.playerMeta}>{remainingPlayer} seeds</Text></View>
      </View>

      <View style={styles.turnRail}>
        <View style={[styles.turnDot, canControlTurn && !finished && handoffSide === null ? styles.turnDotActive : null]} />
        <Text style={styles.turnText}>{statusText}</Text>
        {legalMoves.some((move) => move.isCapture) && canControlTurn && !finished ? <Badge tone="coral">Capture required</Badge> : challenge ? <Badge tone="green">{challenge.category}</Badge> : <Text style={styles.moveCount}>MOVE {game.moveNumber}</Text>}
      </View>

      <View style={[styles.boardWrap, { width: boardSize }]}>
        <DraughtsBoard board={game.board} selected={selected} moves={legalMoves} lastMove={game.lastMove} lastMoveId={game.moveNumber} promotionSquare={game.lastEvent === "promotion" ? game.lastMove?.to : null} disabled={!canControlTurn || finished || paused || handoffSide !== null} localPlayers={localMatch} onCell={onCell} />
      </View>

      <View style={styles.boardHint}>
        <Ionicons name={selected ? "navigate-outline" : "hand-left-outline"} size={16} color={palette.gold} />
        <Text style={styles.hintText}>{selected ? "Choose one of the glowing landing squares." : handoffSide ? `Hand the phone to ${nameForSide(session.mode, handoffSide)}.` : canControlTurn ? lastEventText : "The pieces are moving. One moment…"}</Text>
      </View>

      {challenge ? <Card style={styles.objectiveCard}><View style={styles.objectiveTop}><Eyebrow>OBJECTIVE</Eyebrow><Text style={styles.objectiveCount}>{objectiveProgress}/{challenge.target} {challenge.goal === "crown" ? "crowns" : challenge.goal === "clear" ? "captured" : "turns"}</Text></View><Text style={styles.objectiveText}>{challenge.lesson}</Text></Card> : null}

      <View style={styles.controls}>
        <Control label="Undo" icon="arrow-undo" disabled={!canControlTurn || session.history.length < undoPlies || finished || handoffSide !== null} onPress={undoTurn} />
        <Control label={profile.soundEnabled ? "Sound on" : "Muted"} icon={profile.soundEnabled ? "volume-medium" : "volume-mute"} onPress={toggleSound} />
        <Control label="Rules" icon="book-outline" onPress={() => setShowRules(true)} />
        <Control label="Pause" icon="pause-outline" onPress={() => setPaused(true)} />
      </View>

      <Modal visible={Boolean(localMatch && handoffSide !== null && !finished && !paused && !showRules && !routeChoices)} transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={() => undefined}>
        <View style={styles.handoffBackdrop}><View style={styles.handoffCard}>
          <View style={styles.handoffIcon}><Ionicons name="people-outline" size={25} color={palette.goldLight} /></View>
          <Eyebrow>PASS THE PHONE</Eyebrow>
          <Text style={styles.handoffTitle}>{handoffSide ? nameForSide(session.mode, handoffSide) : "Next player"}</Text>
          <Text style={styles.handoffBody}>{handoffSide === "player" ? "Player 1 moves first from the near side. Hand the phone over when they’re ready." : "Pass the phone to Player 2. The board stays covered until they’re ready to play."}</Text>
          <Button label={`Ready, ${handoffSide ? nameForSide(session.mode, handoffSide) : "player"}`} onPress={() => setHandoffSide(null)} />
        </View></View>
      </Modal>

      <Modal visible={Boolean(routeChoices?.length)} transparent animationType={reducedMotion ? "none" : "slide"} onRequestClose={() => setRouteChoices(null)}>
        <View style={styles.modalBackdrop}><View style={styles.routeSheet}>
          <View style={styles.sheetHandle} /><Eyebrow>YOUR MOVE · CHOOSE A ROUTE</Eyebrow><Text style={styles.routeIntro}>Same landing square. Take any valid route; the longest capture is not required.</Text>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.routeList}>
            {routeChoices?.map((move, index) => {
              const routePath = [move.from, ...move.path].map(positionLabel).join(" → ");
              const captures = move.captured.length;
              const captureLabel = `${captures} ${captures === 1 ? "capture" : "captures"}`;
              return <Pressable key={moveKey(move)} onPress={() => playCurrentMove(move)} accessibilityRole="button" accessibilityLabel={`Route ${index + 1}, ${captureLabel}: ${routePath}`} style={({ pressed }) => [styles.routeOption, pressed && styles.controlPressed]}><View style={{ flex: 1, gap: 5 }}><Text style={styles.routeOptionTitle}>Route {index + 1} · {captureLabel}</Text><Text style={styles.routeOptionPath}>{routePath}</Text></View><Ionicons name="arrow-forward" size={18} color={palette.goldLight} /></Pressable>;
            })}
          </ScrollView>
          <Pressable onPress={() => setRouteChoices(null)} accessibilityRole="button" style={styles.routeCancel}><Text style={styles.routeCancelText}>Keep choosing</Text></Pressable>
        </View></View>
      </Modal>

      <Modal visible={paused && !finished} transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={() => setPaused(false)}>
        <View style={styles.modalBackdrop}><View style={styles.sheet}>
          <View style={styles.sheetHandle} /><Eyebrow>TAKE YOUR TIME</Eyebrow><Text style={styles.sheetTitle}>Game paused</Text><Text style={styles.sheetBody}>The board is right where you left it.</Text>
          <Button label="Back to the board" onPress={() => setPaused(false)} />
          <Button label="Restart this match" variant="outline" onPress={startFresh} />
          <Button label="Return to the lobby" variant="quiet" onPress={() => { setPaused(false); router.replace("/"); }} />
          <Pressable onPress={() => { setPaused(false); setShowRules(true); }} style={styles.sheetLink}><Text style={styles.sheetLinkText}>Read the rules</Text></Pressable>
        </View></View>
      </Modal>

      <Modal visible={showRules} transparent animationType={reducedMotion ? "none" : "slide"} onRequestClose={() => setShowRules(false)}>
        <View style={styles.modalBackdrop}><View style={styles.rulesSheet}>
          <View style={styles.sheetHandle} /><View style={styles.rulesHeader}><View><Eyebrow>THE QUICK GUIDE</Eyebrow><Text style={styles.sheetTitle}>Nigerian Draughts</Text></View><Pressable onPress={() => setShowRules(false)} style={styles.closeButton}><Ionicons name="close" size={21} color={palette.ivory} /></Pressable></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16, paddingBottom: 18 }}>
            <RuleLine number="01" title="A 10 × 10 board" text="Twenty seeds each. Play only the dark squares; you move first from the near side." />
            <RuleLine number="02" title="Seeds move forward" text="A seed steps one square diagonally forward. It can capture an opposing seed in either direction." />
            <RuleLine number="03" title="Captures are compulsory" text="If you can capture, you must. You choose your capture route; the longest-capture rule is not used." />
            <RuleLine number="04" title="Kings fly" text="Reach the far backline to become a king. Kings slide any distance along clear diagonals and may capture at a distance." />
            <RuleLine number="05" title="Claim the board" text="Win by taking every opposing seed or blocking every legal move." />
          </ScrollView>
        </View></View>
      </Modal>

      <Modal visible={finished} transparent animationType={reducedMotion ? "none" : "fade"} onRequestClose={() => router.replace("/")}>
        <View style={styles.modalBackdrop}><View style={styles.resultSheet}>
          <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.resultMedallion, outcomeIsWin ? styles.resultMedallionWin : styles.resultMedallionLoss]}>
              {outcomeIsWin ? <Animated.View entering={reducedMotion ? undefined : ZoomIn.duration(430).springify()}><CrownGlyph size={35} /></Animated.View> : <Text style={styles.resultCrown}>◇</Text>}
            </View>
            <Eyebrow>{localMatch ? "GOOD GAME" : playerWon ? "WELL PLAYED" : "NEXT ROUND"}</Eyebrow>
            <Text style={styles.resultTitle}>{localMatch ? `${winnerName ?? "A player"} wins the round.` : playerWon ? challenge ? "Challenge cleared." : "You own this board." : "The board has spoken."}</Text>
            <Text style={styles.resultBody}>{localMatch ? "A fine game. Run it back or head to the lobby." : playerWon ? challenge ? "That was a sharp finish. Your progress is saved on this device." : "Clean finish. Take the win and keep your streak alive." : "Every great player gets another turn. Come back with a new plan."}</Text>
            {challenge ? <Badge tone="green">{challenge.title}</Badge> : null}
            {displayedReport ? <MatchSummary report={displayedReport} /> : null}
            <View style={{ width: "100%", gap: 10, marginTop: 4 }}>
              {challenge && playerWon && nextChallenge.id !== challenge.id
                ? <Button label={`Take Hurdle ${nextChallenge.stage} · ${nextChallenge.title}`} onPress={() => router.replace({ pathname: "/game", params: { challengeId: nextChallenge.id, difficulty: nextChallenge.difficulty } })} />
                : <Button label={challenge ? "Replay this hurdle" : "Play again"} onPress={startFresh} />}
              <Button label="Back to the lobby" variant="outline" onPress={() => router.replace("/")} />
            </View>
          </ScrollView>
        </View></View>
      </Modal>
    </Screen>
  );
}

function Control({ label, icon, disabled = false, onPress }: { label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; disabled?: boolean; onPress: () => void }) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <AnimatedPressable onPress={onPress} onPressIn={() => { if (!disabled && !reducedMotion) scale.value = withSpring(0.93, { damping: 15, stiffness: 380 }); }} onPressOut={() => { scale.value = reducedMotion ? 1 : withSpring(1, { damping: 14, stiffness: 310 }); }} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} style={[styles.control, disabled && styles.controlDisabled, motion]}><Ionicons name={icon} size={19} color={disabled ? "#718277" : palette.goldLight} /><Text style={[styles.controlLabel, disabled && styles.controlLabelDisabled]}>{label}</Text></AnimatedPressable>;
}

function MatchSummary({ report }: { report: MatchReport }) {
  const modeLabel = report.mode === "challenge"
    ? `${report.challengeTitle ?? "Challenge"} · ${difficultyNames[report.difficulty]}`
    : report.mode === "local" ? "Pass & play · two players" : `${difficultyNames[report.difficulty]} vs Eagle Bot`;
  const playerName = nameForSide(report.mode, "player");
  const opponentName = nameForSide(report.mode, "opponent");
  return (
    <View style={styles.matchReport}>
      <View style={styles.reportHeader}><Eyebrow>GAME REPORT</Eyebrow><Text style={styles.reportTime}>{formatDuration(report.elapsedSeconds)}</Text></View>
      <Text style={styles.reportMode}>{modeLabel}</Text>
      <View style={styles.reportGrid}>
        <SummaryMetric label="MOVES" value={report.moves} detail={`${playerName} ${report.playerMoves} · ${opponentName} ${report.opponentMoves}`} />
        <SummaryMetric label="CAPTURES" value={report.capturesPlayer + report.capturesOpponent} detail={`${playerName} ${report.capturesPlayer} · ${opponentName} ${report.capturesOpponent}`} />
        <SummaryMetric label="CROWNS EARNED" value={report.crownsPlayer + report.crownsOpponent} detail={`${playerName} ${report.crownsPlayer} · ${opponentName} ${report.crownsOpponent}`} />
        <SummaryMetric label="SEEDS LEFT" value={report.remainingPlayer + report.remainingOpponent} detail={`${playerName} ${report.remainingPlayer} · ${opponentName} ${report.remainingOpponent}`} />
      </View>
    </View>
  );
}

function SummaryMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return <View style={styles.reportMetric}><Text style={styles.reportMetricValue}>{value}</Text><Text style={styles.reportMetricLabel}>{label}</Text><Text style={styles.reportMetricDetail} numberOfLines={1}>{detail}</Text></View>;
}

function RuleLine({ number, title, text }: { number: string; title: string; text: string }) {
  return <View style={styles.ruleLine}><Text style={styles.ruleNumber}>{number}</Text><View style={{ flex: 1, gap: 4 }}><Text style={styles.ruleTitle}>{title}</Text><Text style={styles.ruleBody}>{text}</Text></View></View>;
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingHorizontal: 16, paddingTop: 8, alignItems: "stretch" },
  loading: { flex: 1, minHeight: 300, alignItems: "center", justifyContent: "center" },
  loadingText: { color: palette.ivory, fontSize: 14 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52 },
  backButton: { width: 41, height: 41, borderRadius: 14, borderWidth: 1, borderColor: palette.border, backgroundColor: "#18382E", alignItems: "center", justifyContent: "center" },
  topTitle: { flex: 1, gap: 3 },
  topHeading: { color: palette.ivory, fontSize: 18, fontWeight: "900" },
  playerStrip: { flexDirection: "row", alignItems: "center", padding: 11, borderRadius: 17, borderWidth: 1, borderColor: palette.border, backgroundColor: "#18382E", gap: 8 },
  playerToken: { width: 32, height: 32, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  cpuToken: { backgroundColor: "#2B5947", borderColor: "#5D8870", borderWidth: 1 },
  humanToken: { backgroundColor: "#63482B", borderColor: "#AA8248", borderWidth: 1 },
  playerTokenActive: { borderColor: palette.goldLight, borderWidth: 2, transform: [{ scale: 1.06 }] },
  playerTokenLetter: { color: palette.ivory, fontWeight: "900", fontSize: 12 },
  localTokenLetter: { fontSize: 9 },
  playerInfo: { flex: 1, gap: 2 },
  playerInfoRight: { alignItems: "flex-end" },
  playerName: { color: palette.ivory, fontSize: 11, fontWeight: "800" },
  playerMeta: { color: "#91A397", fontSize: 9 },
  vsPill: { width: 25, height: 25, borderRadius: 99, alignItems: "center", justifyContent: "center", backgroundColor: "#29473C" },
  vsText: { color: "#95A69A", fontSize: 8, fontWeight: "900" },
  turnRail: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 28 },
  turnDot: { width: 8, height: 8, borderRadius: 8, backgroundColor: "#65806E" },
  turnDotActive: { backgroundColor: palette.gold, shadowColor: palette.gold, shadowOpacity: 0.6, shadowRadius: 7 },
  turnText: { flex: 1, color: palette.ivory, fontSize: 12, fontWeight: "800" },
  moveCount: { color: "#91A397", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  boardWrap: { alignSelf: "center" },
  boardHint: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, minHeight: 24 },
  hintText: { color: "#A8B7AA", fontSize: 10, lineHeight: 16, textAlign: "center" },
  objectiveCard: { padding: 13, gap: 5 },
  objectiveTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  objectiveCount: { color: palette.goldLight, fontSize: 10, fontWeight: "800" },
  objectiveText: { color: "#B5C2B6", fontSize: 11, lineHeight: 16 },
  controls: { flexDirection: "row", justifyContent: "space-between", gap: 7, paddingTop: 3 },
  control: { flex: 1, minHeight: 55, borderRadius: 15, backgroundColor: "#18382E", borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center", gap: 5 },
  controlDisabled: { opacity: 0.52 },
  controlPressed: { transform: [{ scale: 0.97 }], backgroundColor: "#244A3D" },
  controlLabel: { color: "#D8E1D6", fontSize: 8, fontWeight: "800" },
  controlLabelDisabled: { color: "#728479" },
  handoffBackdrop: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, backgroundColor: palette.forestDeep },
  handoffCard: { width: "100%", maxWidth: 390, alignItems: "center", gap: 14, padding: 26, borderRadius: 26, backgroundColor: "#142F26", borderWidth: 1, borderColor: "#426451" },
  handoffIcon: { width: 58, height: 58, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#54452F", borderWidth: 1, borderColor: "#876D44" },
  handoffTitle: { color: palette.ivory, fontSize: 30, lineHeight: 35, fontWeight: "900", letterSpacing: -0.7 },
  handoffBody: { maxWidth: 300, color: "#AFBEAF", fontSize: 13, lineHeight: 20, textAlign: "center", marginBottom: 3 },
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(4,15,12,0.72)", paddingTop: 45 },
  sheet: { width: "100%", padding: 24, paddingBottom: 30, gap: 13, borderTopLeftRadius: 27, borderTopRightRadius: 27, backgroundColor: "#142F26", borderWidth: 1, borderColor: "#426451" },
  routeSheet: { width: "100%", maxHeight: "84%", padding: 22, paddingBottom: 26, gap: 12, borderTopLeftRadius: 27, borderTopRightRadius: 27, backgroundColor: "#142F26", borderWidth: 1, borderColor: "#426451" },
  routeIntro: { color: palette.muted, fontSize: 12, lineHeight: 18 },
  routeList: { gap: 9, paddingBottom: 3 },
  routeOption: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 15, borderWidth: 1, borderColor: palette.border, backgroundColor: "#1D4034" },
  routeOptionTitle: { color: palette.goldLight, fontSize: 12, fontWeight: "900" },
  routeOptionPath: { color: palette.ivory, fontSize: 11, lineHeight: 17, fontWeight: "700" },
  routeCancel: { alignSelf: "center", paddingVertical: 7 },
  routeCancelText: { color: palette.muted, fontSize: 12, fontWeight: "800" },
  sheetHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 4, backgroundColor: "#5C7567", marginBottom: 4 },
  sheetTitle: { color: palette.ivory, fontSize: 25, lineHeight: 30, fontWeight: "900", letterSpacing: -0.5 },
  sheetBody: { color: palette.muted, fontSize: 13, lineHeight: 19, marginBottom: 5 },
  sheetLink: { alignSelf: "center", paddingVertical: 7 },
  sheetLinkText: { color: palette.goldLight, fontSize: 12, fontWeight: "800" },
  rulesSheet: { maxHeight: "83%", padding: 22, paddingBottom: 18, gap: 19, borderTopLeftRadius: 27, borderTopRightRadius: 27, backgroundColor: "#142F26", borderWidth: 1, borderColor: "#426451" },
  rulesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 15 },
  closeButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#23473B", alignItems: "center", justifyContent: "center" },
  ruleLine: { flexDirection: "row", gap: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#2E4B40" },
  ruleNumber: { width: 26, paddingTop: 2, color: palette.gold, fontSize: 10, fontWeight: "900" },
  ruleTitle: { color: palette.ivory, fontSize: 13, fontWeight: "800" },
  ruleBody: { color: "#A7B8AA", fontSize: 11, lineHeight: 17 },
  resultSheet: { width: "100%", maxHeight: "90%", borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: "#142F26", borderWidth: 1, borderColor: "#426451" },
  resultScroll: { width: "100%" },
  resultContent: { width: "100%", alignItems: "center", gap: 12, padding: 24, paddingBottom: 30 },
  resultMedallion: { width: 64, height: 64, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  resultMedallionWin: { backgroundColor: "#5A4829", borderColor: "#A88447" },
  resultMedallionLoss: { backgroundColor: "#3C3F36", borderColor: "#77765E" },
  resultCrown: { color: palette.goldLight, fontSize: 30 },
  resultTitle: { color: palette.ivory, fontSize: 25, lineHeight: 30, textAlign: "center", fontWeight: "900", letterSpacing: -0.6 },
  resultBody: { maxWidth: 300, color: "#AFBEAF", fontSize: 12, lineHeight: 18, textAlign: "center", marginBottom: 4 },
  matchReport: { width: "100%", gap: 8, padding: 12, borderRadius: 17, backgroundColor: "#102A23", borderWidth: 1, borderColor: "#395849" },
  reportHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reportTime: { color: palette.goldLight, fontSize: 10, fontWeight: "800" },
  reportMode: { color: "#AFC1B1", fontSize: 9, fontWeight: "700", marginTop: -5 },
  reportGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  reportMetric: { width: "47%", flexGrow: 1, minHeight: 61, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: 11, backgroundColor: "#1A3930", paddingHorizontal: 4, paddingVertical: 6 },
  reportMetricValue: { color: palette.ivory, fontSize: 16, fontWeight: "900" },
  reportMetricLabel: { color: palette.goldLight, fontSize: 7, fontWeight: "900", letterSpacing: 0.65 },
  reportMetricDetail: { width: "100%", color: "#A9BAAB", fontSize: 7, textAlign: "center" },
});
