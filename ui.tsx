import React from "react";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { Pressable, ScrollView, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle, Path } from "react-native-svg";
import { palette, radius } from "@/constants/palette";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function useSpringPress(disabled = false) {
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const motion = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const pressIn = () => {
    if (!disabled && !reducedMotion) scale.value = withSpring(0.965, { damping: 16, stiffness: 360, mass: 0.62 });
  };
  const pressOut = () => {
    scale.value = reducedMotion ? 1 : withSpring(1, { damping: 13, stiffness: 300, mass: 0.68 });
  };
  return { motion, pressIn, pressOut };
}

export function Screen({ children, scroll = true, contentStyle }: {
  children: React.ReactNode;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={styles.safe}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.screenContent, contentStyle]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screenContent, styles.fill, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function BrandMark({ size = 54 }: { size?: number }) {
  return (
    <View style={[styles.brandMark, { width: size, height: size, borderRadius: size / 2 }]}>
      <Svg width={size * 0.76} height={size * 0.76} viewBox="0 0 100 100" accessibilityLabel="DraughtHood eagle mascot">
        <Path d="M10 32 38 40 48 49 50 67 42 58 31 61 36 52 21 50 28 44Z" fill={palette.gold} />
        <Path d="M90 32 62 40 52 49 50 67 58 58 69 61 64 52 79 50 72 44Z" fill={palette.gold} />
        <Path d="M38 33 50 19 62 33 58 53 50 61 42 53Z" fill={palette.ivory} />
        <Circle cx="50" cy="49" r="9" fill={palette.forest} stroke={palette.gold} strokeWidth="3" />
        <Path d="M45 69 50 79 55 69" fill={palette.goldLight} />
      </Svg>
    </View>
  );
}

export function Card({ children, style, ...props }: { children: React.ReactNode; style?: StyleProp<ViewStyle> } & Omit<PressableProps, "style">) {
  const press = useSpringPress(Boolean(props.disabled));
  if (!props.onPress) return <Animated.View style={[styles.card, style]}>{children}</Animated.View>;
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(event) => { props.onPressIn?.(event); press.pressIn(); }}
      onPressOut={(event) => { props.onPressOut?.(event); press.pressOut(); }}
      style={[styles.card, style, press.motion]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Button({ label, onPress, variant = "gold", icon, disabled = false, compact = false, accessibilityLabel }: {
  label: string;
  onPress: () => void;
  variant?: "gold" | "light" | "outline" | "quiet" | "danger";
  icon?: string;
  disabled?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
}) {
  const press = useSpringPress(disabled);
  const buttonStyles = [styles.button, styles[`button_${variant}`], compact && styles.buttonCompact, disabled && styles.buttonDisabled];
  const textStyles = [styles.buttonText, styles[`buttonText_${variant}`], disabled && styles.buttonTextDisabled];
  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={press.pressIn}
      onPressOut={press.pressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[buttonStyles, press.motion]}
    >
      {icon ? <Text style={textStyles}>{icon}</Text> : null}
      <Text style={textStyles}>{label}</Text>
    </AnimatedPressable>
  );
}

export function Badge({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "green" | "coral" | "muted" }) {
  return <View style={[styles.badge, styles[`badge_${tone}`]]}><Text style={styles.badgeText}>{children}</Text></View>;
}

export function Eyebrow({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  return <Text style={[styles.eyebrow, style]}>{children}</Text>;
}

export function SectionTitle({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export const textStyles = StyleSheet.create({
  title: { color: palette.ivory, fontSize: 31, lineHeight: 36, fontWeight: "700", letterSpacing: -0.8 },
  serif: { fontFamily: "Georgia" },
  body: { color: palette.muted, fontSize: 14, lineHeight: 21 },
  label: { color: palette.ivory, fontSize: 14, fontWeight: "700" },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.forestDeep },
  screenContent: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 26, gap: 20, backgroundColor: palette.forestDeep },
  fill: { flex: 1 },
  card: { borderRadius: radius.card, backgroundColor: palette.forest, borderColor: palette.border, borderWidth: 1, padding: 18, overflow: "hidden" },
  brandMark: { alignItems: "center", justifyContent: "center", backgroundColor: palette.forestSoft, borderWidth: 1, borderColor: "#4C7665" },
  button: { minHeight: 52, borderRadius: radius.pill, paddingHorizontal: 20, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 9, borderWidth: 1 },
  buttonCompact: { minHeight: 40, paddingHorizontal: 15 },
  button_gold: { backgroundColor: palette.gold, borderColor: palette.gold },
  button_light: { backgroundColor: palette.ivory, borderColor: palette.ivory },
  button_outline: { backgroundColor: "transparent", borderColor: "#5C806E" },
  button_quiet: { backgroundColor: "#23473B", borderColor: "#31584A" },
  button_danger: { backgroundColor: "#4A2C28", borderColor: "#765048" },
  buttonDisabled: { opacity: 0.44 },
  buttonText: { fontSize: 14, lineHeight: 18, fontWeight: "800", letterSpacing: 0.2 },
  buttonText_gold: { color: palette.ink },
  buttonText_light: { color: palette.forestDeep },
  buttonText_outline: { color: palette.ivory },
  buttonText_quiet: { color: palette.ivory },
  buttonText_danger: { color: "#F0B8A7" },
  buttonTextDisabled: { color: palette.ivory },
  badge: { alignSelf: "flex-start", borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 6 },
  badge_gold: { backgroundColor: "#5A4428" },
  badge_green: { backgroundColor: "#254A3C" },
  badge_coral: { backgroundColor: "#573B34" },
  badge_muted: { backgroundColor: "#2C433B" },
  badgeText: { color: palette.goldLight, fontSize: 10, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  eyebrow: { color: palette.gold, fontSize: 10, lineHeight: 14, fontWeight: "800", letterSpacing: 2.1, textTransform: "uppercase" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionTitle: { color: palette.ivory, fontSize: 20, fontWeight: "800", letterSpacing: -0.25 },
  sectionSubtitle: { color: palette.muted, fontSize: 12, lineHeight: 17 },
});
