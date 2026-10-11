import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge, BrandMark, Button, Card, Eyebrow, Screen, SectionTitle, textStyles } from "@/components/game/ui";
import { CrownGlyph } from "@/components/game/crown";
import { palette } from "@/constants/palette";
import { useGameStore } from "@/lib/game/store";
import type { Difficulty } from "@/lib/game/ai";
import { getNextChallenge } from "@/lib/game/challenges";

const levels: { id: Difficulty; title: string; note: string }[] = [
  { id: "relaxed", title: "Relaxed", note: "Warm-up" },
  { id: "club", title: "Club", note: "Think ahead" },
  { id: "champion", title: "Champion", note: "Sharp play" },
];

export default function HomeScreen() {
  const router = useRouter();
  const { profile, loaded } = useGameStore();
  const [difficulty, setDifficulty] = useState<Difficulty>("club");
  const featured = getNextChallenge(profile.completedChallenges);
  const resume = () => router.push("/game");
  const start = () => router.push({ pathname: "/game", params: { mode: "classic", difficulty } });
  const startLocal = () => router.push({ pathname: "/game", params: { mode: "local" } });
  const openChallenge = () => router.push({ pathname: "/game", params: { challengeId: featured.id, difficulty: featured.difficulty } });

  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.brandRow}>
        <BrandMark size={52} />
        <View style={styles.brandCopy}>
          <Text style={styles.wordmark}>DRAUGHTHOOD</Text>
          <Text style={styles.brandTag}>NIGERIAN DRAUGHTS · 10 × 10</Text>
        </View>
        <View style={styles.streakChip}>
          <Ionicons name="flame" size={14} color={palette.gold} />
          <Text style={styles.streakText}>{profile.bestStreak}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <View style={styles.heroTexture} />
        <Eyebrow>Ẹ káàbọ̀, champion</Eyebrow>
        <Text style={[textStyles.title, styles.heroTitle]}>Your move.{"\n"}<Text style={styles.heroAccent}>Make it count.</Text></Text>
        <Text style={styles.heroBody}>A familiar draughts table, brought to your pocket. Pick a pace and take your seat.</Text>
        <View style={styles.heroActions}>
          <Button label={profile.activeSession ? "Continue match" : "Start a match"} icon="↗" onPress={profile.activeSession ? resume : start} />
          {profile.activeSession ? <Pressable style={styles.quickLink} onPress={start}><Text style={styles.quickLinkText}>New game</Text></Pressable> : null}
        </View>
      </View>

      <Card style={styles.localCard} onPress={startLocal} accessibilityRole="button" accessibilityLabel="Play a two-player pass-and-play match on this device">
        <View style={styles.localIcon}><Ionicons name="people-outline" size={20} color={palette.goldLight} /></View>
        <View style={styles.localCopyBlock}>
          <Eyebrow>PASS & PLAY</Eyebrow>
          <Text style={styles.localTitle}>Play together</Text>
          <Text style={styles.localDescription}>Two players. One phone. No network required.</Text>
        </View>
        <Ionicons name="chevron-forward" size={19} color={palette.gold} />
      </Card>

      <View style={styles.difficultySection}>
        <SectionTitle title="Pick your pace" subtitle="Your rival adjusts, not the rules." />
        <View style={styles.levels}>
          {levels.map((level, index) => {
            const active = difficulty === level.id;
            return (
              <Pressable key={level.id} onPress={() => setDifficulty(level.id)} accessibilityRole="radio" accessibilityState={{ selected: active }} style={[styles.level, active && styles.levelActive]}>
                <View style={[styles.levelMarker, active && styles.levelMarkerActive]}><Text style={[styles.levelIndex, active && styles.levelIndexActive]}>{String(index + 1).padStart(2, "0")}</Text></View>
                <Text style={[styles.levelTitle, active && styles.levelTitleActive]}>{level.title}</Text>
                <Text style={styles.levelNote}>{level.note}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Card style={styles.challengeCard} onPress={openChallenge} accessibilityRole="button" accessibilityLabel={`Start challenge: ${featured.title}`}>
        <View style={styles.challengeTop}>
          <Badge tone="coral">{profile.completedChallenges.includes(featured.id) ? "Ladder complete" : `Hurdle ${featured.stage} · next up`}</Badge>
          <Ionicons name="arrow-up-outline" size={20} color={palette.gold} />
        </View>
        <View style={styles.challengeBottom}>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={styles.challengeTitle}>{featured.title}</Text>
            <Text style={styles.challengeCopy}>{featured.subtitle}</Text>
          </View>
          <View style={styles.challengeToken}><CrownGlyph size={25} /></View>
        </View>
      </Card>

      <View style={styles.statsRow}>
        <View style={styles.statBlock}><Text style={styles.statNumber}>{loaded ? profile.gamesPlayed : "—"}</Text><Text style={styles.statLabel}>GAMES</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}><Text style={styles.statNumber}>{loaded ? profile.wins : "—"}</Text><Text style={styles.statLabel}>WINS</Text></View>
        <View style={styles.statDivider} />
        <View style={styles.statBlock}><Text style={styles.statNumber}>{loaded ? profile.currentStreak : "—"}</Text><Text style={styles.statLabel}>STREAK</Text></View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 23, paddingTop: 10, paddingBottom: 105 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  brandCopy: { flex: 1, gap: 3 },
  wordmark: { color: palette.ivory, fontSize: 15, fontWeight: "900", letterSpacing: 2.3 },
  brandTag: { color: "#98AA9C", fontSize: 8, fontWeight: "700", letterSpacing: 1.3 },
  streakChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, borderColor: palette.border, borderWidth: 1, backgroundColor: "#17362D" },
  streakText: { color: palette.ivory, fontSize: 12, fontWeight: "800" },
  hero: { position: "relative", overflow: "hidden", borderRadius: 25, padding: 23, paddingTop: 25, backgroundColor: "#1D493B", borderColor: "#416A57", borderWidth: 1, gap: 13 },
  heroTexture: { position: "absolute", right: -49, top: -40, width: 175, height: 175, borderRadius: 100, borderWidth: 1, borderColor: "rgba(215,155,67,0.20)" },
  heroTitle: { marginTop: 0, fontSize: 34, lineHeight: 37 },
  heroAccent: { color: palette.goldLight },
  heroBody: { maxWidth: 290, color: "#C0D0C2", fontSize: 13, lineHeight: 20 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 4, flexWrap: "wrap" },
  localCard: { flexDirection: "row", alignItems: "center", gap: 13, padding: 15, backgroundColor: "#1A3C31" },
  localIcon: { width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#876D44", backgroundColor: "#54452F" },
  localCopyBlock: { flex: 1, gap: 3 },
  localTitle: { color: palette.ivory, fontSize: 16, fontWeight: "900" },
  localDescription: { color: "#A9BBAA", fontSize: 11, lineHeight: 16 },
  quickLink: { minHeight: 40, justifyContent: "center", paddingHorizontal: 4 },
  quickLinkText: { color: palette.goldLight, fontSize: 13, fontWeight: "800" },
  difficultySection: { gap: 14 },
  levels: { flexDirection: "row", gap: 8 },
  level: { flex: 1, minHeight: 92, padding: 11, borderRadius: 16, borderWidth: 1, borderColor: palette.border, backgroundColor: "#16342B", justifyContent: "space-between" },
  levelActive: { borderColor: palette.gold, backgroundColor: "#3A3426" },
  levelMarker: { width: 25, height: 20, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "#29483D" },
  levelMarkerActive: { backgroundColor: palette.gold },
  levelIndex: { color: "#9CB1A0", fontSize: 9, fontWeight: "900" },
  levelIndexActive: { color: palette.ink },
  levelTitle: { color: palette.ivory, fontSize: 12, fontWeight: "800" },
  levelTitleActive: { color: palette.goldLight },
  levelNote: { color: palette.muted, fontSize: 9, fontWeight: "600" },
  challengeCard: { padding: 17, gap: 17, backgroundColor: "#233E34" },
  challengeTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  challengeBottom: { flexDirection: "row", alignItems: "center", gap: 12 },
  challengeTitle: { color: palette.ivory, fontSize: 18, fontWeight: "800" },
  challengeCopy: { color: "#A9BBAA", fontSize: 12, lineHeight: 17 },
  challengeToken: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#876D44", backgroundColor: "#54452F" },
  challengeTokenText: { color: palette.goldLight, fontSize: 22 },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingVertical: 7 },
  statBlock: { minWidth: 64, alignItems: "center", gap: 3 },
  statNumber: { color: palette.ivory, fontSize: 22, fontWeight: "800" },
  statLabel: { color: "#82968A", fontSize: 8, fontWeight: "800", letterSpacing: 1.4 },
  statDivider: { width: 1, height: 31, backgroundColor: palette.border },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, justifyContent: "center", paddingBottom: 4 },
  footerLine: { height: 1, width: 34, backgroundColor: "#385A4C" },
  footerText: { color: "#819689", fontSize: 10, letterSpacing: 0.7 },
});
