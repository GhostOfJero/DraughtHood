import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Card, Eyebrow, Screen, SectionTitle } from "@/components/game/ui";
import { palette } from "@/constants/palette";
import { useGameStore } from "@/lib/game/store";
import { formatDuration, type MatchReport } from "@/lib/game/stats";
import { nameForSide } from "@/lib/game/mode";

const difficultyLabels = { relaxed: "Relaxed", club: "Club", champion: "Champion" };

export default function RecordsScreen() {
  const { profile, toggleSound } = useGameStore();
  const winRate = profile.gamesPlayed ? Math.round((profile.wins / profile.gamesPlayed) * 100) : 0;
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Eyebrow>Your table</Eyebrow>
        <Text style={styles.title}>Records</Text>
        <Text style={styles.intro}>Your progress stays on this device, ready for the next round.</Text>
      </View>

      <View style={styles.statsGrid}>
        <Card style={styles.statCard}><Ionicons name="game-controller-outline" size={19} color={palette.gold} /><Text style={styles.statNumber}>{profile.gamesPlayed}</Text><Text style={styles.statLabel}>GAMES PLAYED</Text></Card>
        <Card style={styles.statCard}><Ionicons name="trophy-outline" size={19} color={palette.gold} /><Text style={styles.statNumber}>{profile.wins}</Text><Text style={styles.statLabel}>WINS</Text></Card>
        <Card style={styles.statCard}><Ionicons name="trending-up-outline" size={19} color={palette.gold} /><Text style={styles.statNumber}>{winRate}%</Text><Text style={styles.statLabel}>WIN RATE</Text></Card>
        <Card style={styles.statCard}><Ionicons name="flame-outline" size={19} color={palette.gold} /><Text style={styles.statNumber}>{profile.bestStreak}</Text><Text style={styles.statLabel}>BEST STREAK</Text></Card>
      </View>

      <SectionTitle title="Match reports" subtitle={profile.matchReports.length ? `${profile.matchReports.length} recent finishes, saved on this device.` : "A breakdown is saved after every finished game."} />
      {profile.matchReports.length ? (
        <View style={styles.reportList}>
          {profile.matchReports.map((report) => <MatchReportCard key={report.id} report={report} />)}
        </View>
      ) : (
        <Card style={styles.emptyReport}><View style={styles.emptyIcon}><Ionicons name="stats-chart-outline" size={20} color={palette.goldLight} /></View><Text style={styles.emptyTitle}>Your first report is waiting</Text><Text style={styles.emptyText}>Finish a match or challenge to see moves, captures, crowns and the final board count here.</Text></Card>
      )}

      <Card style={styles.settingCard}>
        <View style={styles.settingIcon}><Ionicons name="volume-medium-outline" size={20} color={palette.goldLight} /></View>
        <View style={{ flex: 1, gap: 4 }}><Text style={styles.settingTitle}>Board sounds</Text><Text style={styles.settingBody}>A soft click for each move. Your choice is saved offline.</Text></View>
        <Pressable onPress={toggleSound} accessibilityRole="switch" accessibilityState={{ checked: profile.soundEnabled }} accessibilityLabel="Toggle board sounds" style={[styles.soundToggle, profile.soundEnabled && styles.soundToggleOn]}><View style={[styles.soundThumb, profile.soundEnabled && styles.soundThumbOn]} /></Pressable>
      </Card>

      <SectionTitle title="How to play" subtitle="A quick guide to the Nigerian 10 × 10 game." />
      <Card style={styles.rulesCard}>
        <Rule number="01" title="Move a seed" body="Seeds move one dark square diagonally forward. Tap a seed, then choose a glowing square." />
        <Rule number="02" title="Capture" body="If a capture is available, take one. Seeds can capture forward or backward; a chain may stop after a jump." />
        <Rule number="03" title="Become a king" body="Reach the far backline to earn a crown. Kings fly along open diagonals and capture at a distance." />
        <Rule number="04" title="Choose your route" body="Captures are compulsory, but you choose the route. The longest-capture rule is not imposed." />
        <Rule number="05" title="Win the round" body="Capture every opposing seed or block all their legal moves." last />
      </Card>
      <View style={styles.offlineNote}><Ionicons name="cloud-offline-outline" size={17} color={palette.sage} /><Text style={styles.offlineText}>No account needed. Matches, reports and records are stored on this device.</Text></View>
    </Screen>
  );
}

function MatchReportCard({ report }: { report: MatchReport }) {
  const modeText = report.mode === "challenge"
    ? `Hurdle · ${difficultyLabels[report.difficulty]}`
    : report.mode === "local" ? "Pass & play · local" : `${difficultyLabels[report.difficulty]} CPU`;
  const title = report.challengeTitle ?? (report.mode === "local" ? "Two-player match" : "Classic match");
  const outcome = report.mode === "local" && report.winner ? `${nameForSide(report.mode, report.winner)} wins` : report.outcome;
  const outcomeTone = report.outcome === "win" ? "green" : report.outcome === "loss" ? "coral" : "muted";
  const timestamp = new Date(report.completedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <Card style={styles.reportCard}>
      <View style={styles.reportTop}>
        <View style={styles.reportTitleBlock}><Text style={styles.reportTitle}>{title}</Text><Text style={styles.reportMeta}>{modeText} · {timestamp}</Text></View>
        <Badge tone={outcomeTone}>{outcome}</Badge>
      </View>
      <View style={styles.reportMetrics}>
        <Metric label="MOVES" value={report.moves} detail={`${report.playerMoves} · ${report.opponentMoves}`} />
        <Metric label="CAPTURES" value={report.capturesPlayer + report.capturesOpponent} detail={`${report.capturesPlayer} · ${report.capturesOpponent}`} />
        <Metric label="CROWNS" value={report.crownsPlayer + report.crownsOpponent} detail={`${report.crownsPlayer} · ${report.crownsOpponent}`} />
        <Metric label="TIME" value={formatDuration(report.elapsedSeconds)} detail="elapsed" />
      </View>
      <View style={styles.reportSides}>
        <Text style={styles.reportSideText}>{nameForSide(report.mode, "player")}: {report.remainingPlayer} seeds left</Text>
        <Text style={styles.reportSideText}>{nameForSide(report.mode, "opponent")}: {report.remainingOpponent} seeds left</Text>
      </View>
      <Text style={styles.reportLegend}>{report.mode === "local" ? "Player 1 · Player 2" : "You · Eagle Bot"}</Text>
    </Card>
  );
}

function Metric({ label, value, detail }: { label: string; value: number | string; detail: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text><Text style={styles.metricDetail}>{detail}</Text></View>;
}

function Rule({ number, title, body, last = false }: { number: string; title: string; body: string; last?: boolean }) {
  return <View style={[styles.rule, last && styles.ruleLast]}><Text style={styles.ruleNumber}>{number}</Text><View style={{ flex: 1, gap: 4 }}><Text style={styles.ruleTitle}>{title}</Text><Text style={styles.ruleBody}>{body}</Text></View></View>;
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingTop: 14, paddingBottom: 105 },
  header: { gap: 8, paddingTop: 7 },
  title: { color: palette.ivory, fontSize: 34, lineHeight: 40, fontWeight: "900", letterSpacing: -1 },
  intro: { color: palette.muted, fontSize: 14, lineHeight: 21, maxWidth: 330 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "48%", flexGrow: 1, minHeight: 115, gap: 8, padding: 15, backgroundColor: "#193A30" },
  statNumber: { color: palette.ivory, fontSize: 26, fontWeight: "900", lineHeight: 29 },
  statLabel: { color: "#82988A", fontSize: 8, fontWeight: "800", letterSpacing: 1.2 },
  reportList: { gap: 10 },
  reportCard: { gap: 13, padding: 15, backgroundColor: "#17372D" },
  reportTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 9 },
  reportTitleBlock: { flex: 1, gap: 4 },
  reportTitle: { color: palette.ivory, fontSize: 15, fontWeight: "900" },
  reportMeta: { color: palette.muted, fontSize: 9, lineHeight: 14 },
  reportMetrics: { flexDirection: "row", flexWrap: "wrap", borderRadius: 13, overflow: "hidden", backgroundColor: "#102A23" },
  metric: { width: "25%", minWidth: 62, alignItems: "center", justifyContent: "center", gap: 3, paddingVertical: 9, paddingHorizontal: 3 },
  metricValue: { color: palette.goldLight, fontSize: 14, fontWeight: "900" },
  metricLabel: { color: "#90A495", fontSize: 7, fontWeight: "900", letterSpacing: 0.6 },
  metricDetail: { color: "#B8C6B7", fontSize: 8, fontWeight: "700" },
  reportSides: { flexDirection: "row", justifyContent: "space-between", flexWrap: "wrap", gap: 6 },
  reportSideText: { color: "#C1CEC0", fontSize: 9, fontWeight: "700" },
  reportLegend: { color: "#748A7A", fontSize: 8, letterSpacing: 0.6 },
  emptyReport: { alignItems: "center", gap: 8, padding: 22, backgroundColor: "#17372D" },
  emptyIcon: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: "#57462D" },
  emptyTitle: { color: palette.ivory, fontSize: 14, fontWeight: "900" },
  emptyText: { maxWidth: 280, color: palette.muted, fontSize: 11, lineHeight: 17, textAlign: "center" },
  settingCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15 },
  settingIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#3A372A", alignItems: "center", justifyContent: "center" },
  settingTitle: { color: palette.ivory, fontSize: 14, fontWeight: "800" },
  settingBody: { color: palette.muted, fontSize: 10, lineHeight: 15 },
  soundToggle: { width: 46, height: 27, borderRadius: 99, backgroundColor: "#45574C", borderColor: "#647466", borderWidth: 1, paddingHorizontal: 3, justifyContent: "center" },
  soundToggleOn: { backgroundColor: "#8A6835", borderColor: "#C1934E" },
  soundThumb: { width: 19, height: 19, borderRadius: 99, backgroundColor: "#D7DDD3" },
  soundThumbOn: { alignSelf: "flex-end", backgroundColor: palette.goldLight },
  rulesCard: { paddingVertical: 3, paddingHorizontal: 16 },
  rule: { flexDirection: "row", gap: 13, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#315044" },
  ruleLast: { borderBottomWidth: 0 },
  ruleNumber: { width: 28, color: palette.gold, fontSize: 10, fontWeight: "900", letterSpacing: 0.5, paddingTop: 2 },
  ruleTitle: { color: palette.ivory, fontSize: 13, fontWeight: "800" },
  ruleBody: { color: "#A8B8A9", fontSize: 11, lineHeight: 17 },
  offlineNote: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 3 },
  offlineText: { flex: 1, color: "#95A79A", fontSize: 11, lineHeight: 17 },
});
