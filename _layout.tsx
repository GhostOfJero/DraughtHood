import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { palette } from "@/constants/palette";

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 8);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.gold,
        tabBarInactiveTintColor: "#82968A",
        tabBarStyle: {
          height: 57 + bottomPadding,
          paddingTop: 8,
          paddingBottom: bottomPadding,
          backgroundColor: "#102A23",
          borderTopColor: "#24483D",
          borderTopWidth: 1,
          elevation: 0,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Play", tabBarIcon: ({ color, size }) => <Ionicons name="game-controller-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="challenges" options={{ title: "Challenges", tabBarIcon: ({ color, size }) => <Ionicons name="trophy-outline" size={size} color={color} /> }} />
      <Tabs.Screen name="records" options={{ title: "Records", tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart-outline" size={size} color={color} /> }} />
    </Tabs>
  );
}
