import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useColors } from "@/hooks/useColors";

// @ts-ignore
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function scoreToColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#EF4444";
  return "#DC2626";
}

interface ScoreRingProps {
  score: number;
  grade: string;
  size?: number;
}

export function ScoreRing({ score, grade, size = 160 }: ScoreRingProps) {
  const colors = useColors();
  const r = size * 0.375;
  const circ = 2 * Math.PI * r;
  const center = size / 2;
  const sw = size * 0.075;
  const color = scoreToColor(score);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(score / 100, {
      duration: 1200,
      easing: Easing.out(Easing.quad),
    });
  }, [score]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circ * (1 - progress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={colors.border}
          strokeWidth={sw}
        />
        <AnimatedCircle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={circ}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      <View style={styles.overlay}>
        <Text style={[styles.scoreNum, { color, fontSize: size * 0.22 }]}>
          {Math.round(score)}
        </Text>
        <Text style={[styles.grade, { color: colors.foreground, fontSize: size * 0.14 }]}>
          {grade}
        </Text>
        <Text style={[styles.atsLabel, { color: colors.mutedForeground, fontSize: size * 0.075 }]}>
          ATS Score
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { alignItems: "center" },
  scoreNum: { fontFamily: "Inter_700Bold" },
  grade: { fontFamily: "Inter_700Bold", marginTop: 2 },
  atsLabel: { fontFamily: "Inter_400Regular", marginTop: 2, letterSpacing: 0.5 },
});
