import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { getHistory } from "@/utils/api";
import { scoreToColor } from "@/components/ScoreRing";

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const data = await getHistory();
      setHistory(data ?? []);
    } catch (e: any) {
      setError(e.message ?? "Failed to load history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const headerPaddingTop = Platform.OS === "web"
    ? 67 + insets.top
    : insets.top + 16;

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: headerPaddingTop, borderBottomColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Scan History</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
          {history.length} scan{history.length !== 1 ? "s" : ""}
        </Text>
      </View>
      <FlatList
        data={history}
        keyExtractor={(item) => item.scan_id ?? String(Math.random())}
        scrollEnabled={!!history.length}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadHistory(true); }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24 + (Platform.OS === "web" ? 34 : 0),
          gap: 10,
          flexGrow: 1,
        }}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 }}>
            {error ? (
              <>
                <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
                <Text style={{ fontSize: 14, color: colors.destructive, textAlign: "center", fontFamily: "Inter_400Regular" }}>{error}</Text>
                <Pressable
                  onPress={() => loadHistory()}
                  style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 10 }}
                >
                  <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold" }}>Retry</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Ionicons name="documents-outline" size={48} color={colors.mutedForeground} />
                <Text style={{ fontSize: 15, color: colors.mutedForeground, textAlign: "center", fontFamily: "Inter_400Regular" }}>
                  No scans yet.{"\n"}Upload a resume to get started.
                </Text>
              </>
            )}
          </View>
        }
        renderItem={({ item }) => <HistoryItem item={item} colors={colors} />}
      />
    </View>
  );
}

function HistoryItem({ item, colors }: { item: any; colors: any }) {
  const score = item.overall_score ?? 0;
  const color = scoreToColor(score);
  const date = item.timestamp
    ? new Date(item.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : "";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.75 : 1 },
      ]}
      onPress={() => router.push(`/results?id=${item.scan_id}`)}
    >
      <View style={[styles.scoreBadge, { backgroundColor: color + "20" }]}>
        <Text style={[styles.scoreNum, { color }]}>{Math.round(score)}</Text>
        <Text style={[styles.grade, { color }]}>{item.letter_grade ?? ""}</Text>
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.filename, { color: colors.foreground }]} numberOfLines={1}>
          {item.filename ?? "Resume"}
        </Text>
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{date}</Text>
        {item.file_type && (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {item.file_type.toUpperCase()}
            {item.processing_time_seconds != null && ` · ${item.processing_time_seconds.toFixed(1)}s`}
          </Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 14,
  },
  scoreBadge: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: "center", justifyContent: "center",
  },
  scoreNum: { fontSize: 17, fontFamily: "Inter_700Bold", lineHeight: 19 },
  grade: { fontSize: 11, fontFamily: "Inter_700Bold" },
  filename: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  date: { fontSize: 12, fontFamily: "Inter_400Regular" },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
