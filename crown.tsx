import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

export function CrownGlyph({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.76} viewBox="0 0 48 36">
      <Path d="M4 9.5 12.1 15 17.5 5.2 24 13.4 30.6 4.8 36 15 44 9.2 39.8 28.2H8.2L4 9.5Z" fill="#F4C252" stroke="#472B13" strokeWidth={2.8} strokeLinejoin="round" />
      <Path d="m8.2 25.2 31.6-.1-2 7.2H10.1l-1.9-7.1Z" fill="#A86218" stroke="#472B13" strokeWidth={2.2} strokeLinejoin="round" />
      <Path d="m7.2 11.2 6.3 4.2 4.7-8 5.8 7.1 6.3-7.5 5 8.1 6.2-4.1-3.5 13H10.8L7.2 11.2Z" fill="#FFD875" />
      <Path d="M11.5 25.2h25" stroke="#FFE9A5" strokeWidth={1.6} strokeLinecap="round" />
      <Circle cx={12} cy={16} r={2.5} fill="#63E0C2" stroke="#593A20" strokeWidth={1} />
      <Circle cx={24} cy={14} r={2.9} fill="#83F0CF" stroke="#593A20" strokeWidth={1} />
      <Circle cx={36} cy={16} r={2.5} fill="#63E0C2" stroke="#593A20" strokeWidth={1} />
      <Path d="M17.7 7.8 20 11M30.3 7.4l-2.2 3.8" stroke="#FFF4CD" strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
