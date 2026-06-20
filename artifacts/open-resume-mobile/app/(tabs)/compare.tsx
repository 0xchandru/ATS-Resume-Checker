import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { getHistory, compareScans } from "@/utils/api";
import { scoreToColor } from "@/components/ScoreRing";

export default function CompareScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [scan1, setScan1] = useState<any | null>(null);
  const [scan2, setScan2] = useState<any | null>(null);
  const [compareResult, setCompareResult] = useState<any | null>(null);
  const [comparing, setComparing] = useState(false);
  const [pickerFor, setPickerFor] = useState<1 | 2 | null>(null);
  const [error, setError] = useState("");

  useFocusEffect(
    useCallback(() => {
      getHistory()
        .then((d) => setHistory(d ?? []))
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }, [])
  );

  const runCompare = async () => {
    if (!scan1 || !scan2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setComparing(true);
    setError("");
    try {
      const result = await compareScans(scan1.scan_id, scan2.scan_id);
      setCompareResult(result);
    } catch (e: any) {
      setError(e.message ?? "Comparison failed");
    } finally {
      setComparing(false);
    }
  };

  const headerPaddingTop = Platform.OS === "web" ? 67 + insets.top : insets.top + 16;
  const canCompare = !!scan1 && !!scan2 && !comparing;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: headerPaddingTop, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Compare</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Side-by-side ATS comparison</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 + (Platform.OS === "web" ? 34 : 0) }}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <ScanPicker label="Scan A" scan={scan1} onPick={() => setPickerFor(1)} colors={colors} />
          <ScanPicker label="Scan B" scan={scan2} onPick={() => setPickerFor(2)} colors={colors} />
        </View>

        <Pressable
          style={({ pressed }) => ({
            backgroundColor: canCompare ? colors.primary : colors.muted,
            paddingVertical: 14, borderRadius: 10, alignItems: "center",
            flexDirection: "row", justifyContent: "center", gap: 8,
            opacity: pressed ? 0.8 : 1,
          })}
          onPress={runCompare}
          disabled={!canCompare}
        >
          {comparing
            ? <ActivityIndicator color="#fff" size="small" />
            : <Ionicons name="git-compare-outline" size={20} color={canCompare ? "#fff" : colors.mutedForeground} />
          }
          <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: canCompare ? "#fff" : colors.mutedForeground }}>
            {comparing ? "Comparing..." : "Compare Scans"}
          </Text>
        </Pressable>

        {!!error && (
          <Text style={{ color: colors.destructive, fontSize: 13, fontFamily: "Inter_400Regular" }}>{error}</Text>
        )}

        {compareResult && (
          <CompareResults result={compareResult} scan1={scan1} scan2={scan2} colors={colors} />
        )}
      </ScrollView>

      <Modal
        visible={pickerFor !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerFor(null)}
      >
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.header, { paddingTop: 16, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.headerTitle, { color: colors.foreground, fontSize: 18 }]}>
              Select Scan {pickerFor}
            </Text>
          </View>
          {loadingHistory ? (
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={history}
              keyExtractor={(item) => item.scan_id}
              contentContainerStyle={{ padding: 16, gap: 10 }}
              ListEmptyComponent={
                <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 40, fontFamily: "Inter_400Regular" }}>
                  No scans available. Analyze a resume first.
                </Text>
              }
              renderItem={({ item }) => {
                const score = item.overall_score ?? 0;
                const color = scoreToColor(score);
                return (
                  <Pressable
                    style={({ pressed }) => [
                      { flexDirection: "row", gap: 12, alignItems: "center", backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, borderRadius: 12, padding: 14, opacity: pressed ? 0.75 : 1 },
                    ]}
                    onPress={() => {
                      if (pickerFor === 1) setScan1(item);
                      else setScan2(item);
                      setPickerFor(null);
                      setCompareResult(null);
                    }}
                  >
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: color + "20", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color }}>{Math.round(score)}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }} numberOfLines={1}>
                        {item.filename}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.mutedForeground }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleDateString() : ""}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={colors.mutedForeground} />
                  </Pressable>
                );
              }}
            />
          )}
          <Pressable
            style={{ margin: 16, padding: 14, borderRadius: 10, backgroundColor: colors.muted, alignItems: "center" }}
            onPress={() => setPickerFor(null)}
          >
            <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.mutedForeground }}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}

function ScanPicker({ label, scan, onPick, colors }: { label: string; scan: any; onPick: () => void; colors: any }) {
  const score = scan?.overall_score ?? 0;
  const color = scoreToColor(score);
  return (
    <Pressable
      style={({ pressed }) => ({
        flex: 1, borderWidth: scan ? 2 : 1.5,
        borderColor: scan ? colors.primary : colors.border,
        borderRadius: 10, padding: 14, gap: 6,
        backgroundColor: colors.card, opacity: pressed ? 0.75 : 1,
        borderStyle: scan ? "solid" : "dashed",
        alignItems: "center", minHeight: 100, justifyContent: "center",
      })}
      onPress={onPick}
    >
      <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: colors.mutedForeground, letterSpacing: 1 }}>
        {label}
      </Text>
      {scan ? (
        <>
          <Text style={{ fontSize: 28, fontFamily: "Inter_700Bold", color }}>{Math.round(score)}</Text>
          <Text style={{ fontSize: 10, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" }} numberOfLines={2}>
            {scan.filename}
          </Text>
        </>
      ) : (
        <>
          <Ionicons name="add-circle-outline" size={28} color={colors.mutedForeground} />
          <Text style={{ fontSize: 11, color: colors.mutedForeground, fontFamily: "Inter_400Regular" }}>Tap to select</Text>
        </>
      )}
    </Pressable>
  );
}

function CompareResults({ result, scan1, scan2, colors }: { result: any; scan1: any; scan2: any; colors: any }) {
  const s1Score = scan1?.overall_score ?? 0;
  const s2Score = scan2?.overall_score ?? 0;
  const winner = s1Score >= s2Score ? "A" : "B";
  const shared: string[] = result?.shared_keywords ?? [];
  const uniqueA: string[] = result?.unique_to_a ?? [];
  const uniqueB: string[] = result?.unique_to_b ?? [];

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <ScoreCell label="Scan A" score={s1Score} grade={scan1?.letter_grade} winner={winner === "A"} colors={colors} />
        <ScoreCell label="Scan B" score={s2Score} grade={scan2?.letter_grade} winner={winner === "B"} colors={colors} />
      </View>
      {shared.length > 0 && <KwGroup title={`Shared (${shared.length})`} items={shared} color={colors.primary} colors={colors} />}
      {uniqueA.length > 0 && <KwGroup title={`Only in A (${uniqueA.length})`} items={uniqueA} color="#10B981" colors={colors} />}
      {uniqueB.length > 0 && <KwGroup title={`Only in B (${uniqueB.length})`} items={uniqueB} color="#F59E0B" colors={colors} />}
    </View>
  );
}

function ScoreCell({ label, score, grade, winner, colors }: { label: string; score: number; grade?: string; winner: boolean; colors: any }) {
  const color = scoreToColor(score);
  return (
    <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 12, borderWidth: winner ? 2 : StyleSheet.hairlineWidth, borderColor: winner ? colors.primary : colors.border, padding: 16, alignItems: "center", gap: 4 }}>
      <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: colors.mutedForeground, letterSpacing: 0.5 }}>{label}</Text>
      <Text style={{ fontSize: 32, fontFamily: "Inter_700Bold", color }}>{Math.round(score)}</Text>
      {grade && <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color }}>{grade}</Text>}
      {winner && (
        <View style={{ backgroundColor: colors.primary + "20", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 }}>
          <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: colors.primary }}>WINNER</Text>
        </View>
      )}
    </View>
  );
}

function KwGroup({ title, items, color, colors }: { title: string; items: string[]; color: string; colors: any }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, padding: 14, gap: 8 }}>
      <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{title}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {items.slice(0, 20).map((kw, i) => (
          <View key={i} style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: color + "15", borderWidth: 1, borderColor: color + "30" }}>
            <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color }}>{kw}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
});
