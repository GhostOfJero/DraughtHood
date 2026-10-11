import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Badge, Card, Eyebrow, Screen, SectionTitle } from "@/components/game/ui";
import { palette } from "@/constants/palette";
import { CHALLENGES, isChallengeUnlocked } from "@/lib/game/challenges";
import { useGameStore } from "@/lib/game/store";

const difficultyLabels = { relaxed: "Warm-up", club: "Tactical", champion: "Master" };

export default function ChallengesScreen() {
  const router = useRouter();
  const { profile } = useGameStore();
  const clearedCount = CHALLENGES.filter((challenge) => profile.completedChallenges.includes(challenge.id)).length;
  const nextHurdle = CHALLENGES.find((challenge) => !profile.completedChallenges.includes(challenge.id)) ?? CHALLENGES[CHALLENGES.length - 1];
  return (
    <Screen contentStyle={styles.content}>
      <View style={styles.header}>
        <Eyebrow>Read the board</Eyebrow>
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.intro}>Five hurdles. Sharper decisions at every stage. Clear one to open the next.</Text>
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryIcon}><Ionicons name="sparkles" size={16} color={palette.goldLight} /></View>
        <View style={styles.summaryCopy}><Text style={styles.summaryText}>{clearedCount} of {CHALLENGES.length} cleared</Text><Text style={styles.summaryHint}>{clearedCount === CHALLENGES.length ? "The full ladder is open for replay." : `Hurdle ${nextHurdle.stage} is next.`}</Text></View>
        <View style={styles.summaryTrack}><View style={[styles.summaryFill, { width: `${(clearedCount / CHALLENGES.length) * 100}%` }]} /></View>
      </View>
      <SectionTitle title="The challenge ladder" subtitle="Complete each open hurdle to reveal the next." />
      {CHALLENGES.map((challenge, index) => {
        const complete = profile.completedChallenges.includes(challenge.id);
        const unlocked = isChallengeUnlocked(challenge.id, profile.completedChallenges);
        const previous = CHALLENGES[index - 1];
        const lockHint = previous ? `Clear Hurdle ${previous.stage} · ${previous.title} to unlock this one.` : "This first hurdle is ready.";
        const status = !unlocked ? "Locked" : complete ? "Cleared" : "Open";
        return (
          <Card key={challenge.id} style={[styles.challengeCard, !unlocked && styles.challengeCardLocked, { borderColor: complete ? `${challenge.accent}88` : palette.border }]}>
            <View style={styles.cardTop}>
              <View style={[styles.ordinal, { backgroundColor: `${challenge.accent}22`, borderColor: `${challenge.accent}66` }]}><Text style={[styles.ordinalText, { color: challenge.accent }]}>{String(challenge.stage).padStart(2, "0")}</Text></View>
              <View style={styles.badges}>
                <Badge tone={challenge.difficulty === "champion" ? "coral" : challenge.difficulty === "club" ? "green" : "gold"}>{difficultyLabels[challenge.difficulty]}</Badge>
                <Badge tone={!unlocked ? "muted" : complete ? "green" : "gold"}>{status}</Badge>
              </View>
            </View>
            <Text style={[styles.cardTitle, !unlocked && styles.lockedText]}>{challenge.title}</Text>
            <Text style={styles.cardSub}>{challenge.subtitle}</Text>
            <View style={[styles.lesson, !unlocked && styles.lessonLocked]}>
              <Ionicons name={unlocked ? "bulb-outline" : "lock-closed-outline"} size={15} color={unlocked ? challenge.accent : palette.muted} />
              <Text style={styles.lessonText}>{unlocked ? challenge.lesson : lockHint}</Text>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.category}>{`HURDLE ${challenge.stage}  ·  ${challenge.category.toUpperCase()}  ·  ${challenge.seedCount} SEEDS`}</Text>
              <Pressable
                onPress={() => router.push({ pathname: "/game", params: { challengeId: challenge.id, difficulty: challenge.difficulty } })}
                disabled={!unlocked}
                accessibilityRole="button"
                accessibilityState={{ disabled: !unlocked }}
                accessibilityLabel={unlocked ? `${complete ? "Replay" : "Play"} Hurdle ${challenge.stage}: ${challenge.title}` : `Locked Hurdle ${challenge.stage}: ${lockHint}`}
                style={({ pressed }) => [styles.playButton, { backgroundColor: !unlocked ? "#23372F" : complete ? "#2B463A" : challenge.accent }, !unlocked && styles.playButtonLocked, pressed && unlocked && styles.pressed]}
              >
                {!unlocked ? <Ionicons name="lock-closed" size={13} color="#859589" /> : null}
                <Text style={[styles.playText, (complete || !unlocked) && styles.playTextComplete]}>{!unlocked ? "Locked" : complete ? "Replay" : "Take hurdle"}</Text>
                {unlocked ? <Ionicons name="arrow-forward" size={14} color={complete ? palette.goldLight : palette.ink} /> : null}
              </Pressable>
            </View>
          </Card>
        );
      })}
      <View style={styles.cultureNote}><Text style={styles.cultureGlyph}>✳</Text><Text style={styles.cultureText}>Good play is good company. Take your time, and enjoy the board.</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: 18, paddingTop: 14, paddingBottom: 105 },
  header: { gap: 8, paddingTop: 7 },
  title: { color: palette.ivory, fontSize: 34, lineHeight: 40, fontWeight: "900", letterSpacing: -1 },
  intro: { color: palette.muted, fontSize: 14, lineHeight: 21, maxWidth: 320 },
  summary: { flexDirection: "row", alignItems: "center", gap: 11, padding: 14, borderRadius: 15, backgroundColor: "#193B30", borderColor: palette.border, borderWidth: 1 },
  summaryIcon: { width: 32, height: 32, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "#57462D" },
  summaryCopy: { flex: 1, gap: 3 },
  summaryText: { color: palette.ivory, fontSize: 12, fontWeight: "800" },
  summaryHint: { color: palette.muted, fontSize: 9, fontWeight: "600" },
  summaryTrack: { width: 58, height: 5, borderRadius: 5, backgroundColor: "#39564A", overflow: "hidden" },
  summaryFill: { height: 5, borderRadius: 5, backgroundColor: palette.gold },
  challengeCard: { gap: 10, padding: 17 },
  challengeCardLocked: { opacity: 0.8, backgroundColor: "#142A23" },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  ordinal: { width: 36, height: 36, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  ordinalText: { fontSize: 11, fontWeight: "900" },
  badges: { flexDirection: "row", gap: 7 },
  cardTitle: { color: palette.ivory, fontSize: 20, fontWeight: "900", marginTop: 2 },
  lockedText: { color: "#BBC5BC" },
  cardSub: { color: "#B4C2B5", fontSize: 13, lineHeight: 18 },
  lesson: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#102A23", borderRadius: 11, padding: 11, marginTop: 3 },
  lessonLocked: { backgroundColor: "#192B24" },
  lessonText: { flex: 1, color: "#C3CFBF", fontSize: 11, lineHeight: 16 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 4 },
  category: { color: "#82988A", fontSize: 8, fontWeight: "800", letterSpacing: 1, flex: 1 },
  playButton: { minHeight: 38, borderRadius: 99, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 7 },
  playButtonLocked: { borderWidth: 1, borderColor: "#3C5147" },
  playText: { color: palette.ink, fontSize: 10, fontWeight: "900" },
  playTextComplete: { color: palette.goldLight },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  cultureNote: { flexDirection: "row", gap: 10, padding: 14, alignItems: "center", borderTopWidth: 1, borderTopColor: palette.border },
  cultureGlyph: { color: palette.gold, fontSize: 18 },
  cultureText: { flex: 1, color: "#98A99C", fontSize: 11, lineHeight: 17 },
});
