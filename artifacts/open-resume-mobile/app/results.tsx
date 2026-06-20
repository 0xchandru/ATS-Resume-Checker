import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { useAnalysis } from "@/context/AnalysisContext";
import { getHistoryItem, type AnalysisResult } from "@/utils/api";
import { ScoreRing, scoreToColor } from "@/components/ScoreRing";

const TABS = ["Overview", "Keywords", "Feedback", "Career", "Format"] as const;
type Tab = typeof TABS[number];

const SUB_SCORE_LABELS: Record<string, string> = {
  keyword_match: "Keywords",
  semantic_relevance: "Semantic",
  section_completeness: "Sections",
  format_compliance: "Format",
  impact_quantification: "Impact",
};

export default function ResultsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentResult } = useAnalysis();
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("Overview");

  useEffect(() => {
    if (currentResult?.scan_id === id) {
      setResult(currentResult);
    } else if (id) {
      setLoading(true);
      getHistoryItem(id)
        .then(setResult)
        .catch((e: any) => setError(e.message ?? "Failed to load results"))
        .finally(() => setLoading(false));
    }
  }, [id, currentResult]);

  const s = useMemo(() => makeStyles(colors), [colors]);

  if (loading) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={s.loadingText}>Loading results...</Text>
      </View>
    );
  }

  if (error || !result) {
    return (
      <View style={[s.center, { backgroundColor: colors.background }]}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.destructive} />
        <Text style={s.errorText}>{error || "No result found"}</Text>
        <Pressable style={[s.backBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={s.backBtnText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { paddingTop: insets.top + (Platform.OS === "web" ? 67 : 8), borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={s.backIcon}>
          <Ionicons name="chevron-back" size={24} color={colors.foreground} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
            {result.filename}
          </Text>
          <Text style={[s.headerSub, { color: colors.mutedForeground }]}>
            {new Date(result.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
      </View>

      <View style={[s.scoreBanner, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScoreRing score={result.overall_score} grade={result.letter_grade} size={130} />
        <View style={s.subScoreGrid}>
          {Object.entries(result.sub_scores ?? {}).slice(0, 4).map(([key, val]) => (
            <View key={key} style={[s.subScoreItem, { backgroundColor: colors.muted }]}>
              <Text style={[s.subScoreVal, { color: scoreToColor(val as number) }]}>{Math.round(val as number)}</Text>
              <Text style={[s.subScoreLabel, { color: colors.mutedForeground }]} numberOfLines={2}>
                {SUB_SCORE_LABELS[key] ?? key}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[s.tabBar, { borderBottomColor: colors.border, backgroundColor: colors.card }]}
        contentContainerStyle={{ paddingHorizontal: 12 }}
      >
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            style={[s.tab, activeTab === tab && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, { color: activeTab === tab ? colors.primary : colors.mutedForeground }]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 + (Platform.OS === "web" ? 34 : 0) }}
      >
        {activeTab === "Overview" && <OverviewTab result={result} colors={colors} />}
        {activeTab === "Keywords" && <KeywordsTab result={result} colors={colors} />}
        {activeTab === "Feedback" && <FeedbackTab result={result} colors={colors} />}
        {activeTab === "Career" && <CareerTab result={result} colors={colors} />}
        {activeTab === "Format" && <FormatTab result={result} colors={colors} />}
      </ScrollView>
    </View>
  );
}

function OverviewTab({ result, colors }: { result: AnalysisResult; colors: any }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={[gStyles.sectionTitle, { color: colors.foreground }]}>Sub-scores</Text>
      {Object.entries(result.sub_scores ?? {}).map(([key, val]) => (
        <View key={key} style={[gStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={[gStyles.cardTitle, { color: colors.foreground }]}>{SUB_SCORE_LABELS[key] ?? key}</Text>
            <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: scoreToColor(val as number) }}>{Math.round(val as number)}</Text>
          </View>
          <View style={[gStyles.progressBg, { backgroundColor: colors.muted }]}>
            <View style={[gStyles.progressFill, { width: `${val as number}%` as any, backgroundColor: scoreToColor(val as number) }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function KeywordsTab({ result, colors }: { result: AnalysisResult; colors: any }) {
  const kw = result.keywords;
  if (!kw) return <Text style={{ color: colors.mutedForeground }}>No keyword data.</Text>;
  return (
    <View style={{ gap: 16 }}>
      <KeywordGroup title="Matched" items={kw.matched} color="#10B981" colors={colors} />
      <KeywordGroup title="Partial" items={kw.partial} color="#F59E0B" colors={colors} />
      <KeywordGroup title="Missing" items={kw.missing} color="#EF4444" colors={colors} />
    </View>
  );
}

function KeywordGroup({ title, items, color, colors }: { title: string; items: string[]; color: string; colors: any }) {
  if (!items?.length) return null;
  return (
    <View>
      <Text style={[gStyles.sectionTitle, { color: colors.foreground }]}>{title} ({items.length})</Text>
      <View style={gStyles.chips}>
        {items.slice(0, 30).map((kw, i) => (
          <View key={i} style={[gStyles.chip, { backgroundColor: color + "20", borderColor: color + "40" }]}>
            <Text style={[gStyles.chipText, { color }]}>{kw}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#EF4444", high: "#F97316", medium: "#F59E0B", low: "#10B981", info: "#3B82F6",
};

function FeedbackTab({ result, colors }: { result: AnalysisResult; colors: any }) {
  const fb = result.feedback ?? [];
  if (!fb.length)
    return (
      <View style={{ alignItems: "center", gap: 12, paddingTop: 40 }}>
        <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
        <Text style={{ fontSize: 14, color: colors.mutedForeground, fontFamily: "Inter_400Regular", textAlign: "center" }}>
          No feedback — your resume looks solid!
        </Text>
      </View>
    );
  return (
    <View style={{ gap: 10 }}>
      {fb.map((item, i) => (
        <View key={i} style={[gStyles.card, { backgroundColor: colors.card, borderColor: colors.border, borderLeftWidth: 3, borderLeftColor: SEVERITY_COLORS[item.severity] ?? colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <View style={[gStyles.badge, { backgroundColor: (SEVERITY_COLORS[item.severity] ?? colors.muted) + "20" }]}>
              <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: SEVERITY_COLORS[item.severity] ?? colors.mutedForeground }}>
                {(item.severity ?? "").toUpperCase()}
              </Text>
            </View>
            <Text style={[gStyles.cardTitle, { color: colors.foreground, flex: 1 }]} numberOfLines={2}>{item.title}</Text>
          </View>
          <Text style={[gStyles.bodyText, { color: colors.mutedForeground }]}>{item.message}</Text>
          {!!item.suggestion && (
            <Text style={[gStyles.bodyText, { color: colors.primary, marginTop: 6 }]}>{"\u2192"} {item.suggestion}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

function CareerTab({ result, colors }: { result: AnalysisResult; colors: any }) {
  const ci = result.career_intelligence;
  const sp = result.skill_prediction;
  if (!ci && !sp) return <Text style={{ color: colors.mutedForeground }}>No career data available.</Text>;
  return (
    <View style={{ gap: 10 }}>
      {ci && (
        <>
          {!!ci.career_stage && <InfoRow label="Career Stage" value={ci.career_stage} colors={colors} />}
          {!!ci.seniority_level && <InfoRow label="Seniority" value={ci.seniority_level} colors={colors} />}
          {ci.detected_roles?.length > 0 && (
            <ChipCard title="Detected Roles" items={ci.detected_roles} color={colors.primary} bg={colors.primary + "15"} colors={colors} />
          )}
          {ci.industry_signals?.length > 0 && (
            <ChipCard title="Industry Signals" items={ci.industry_signals} color={colors.mutedForeground} bg={colors.muted} colors={colors} />
          )}
        </>
      )}
      {sp?.predicted_skills?.length > 0 && (
        <ChipCard title="Predicted Skills" items={sp.predicted_skills.slice(0, 20)} color={colors.primary} bg={colors.primary + "15"} colors={colors} />
      )}
    </View>
  );
}

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={[gStyles.card, { backgroundColor: colors.card, borderColor: colors.border, flexDirection: "row", justifyContent: "space-between" }]}>
      <Text style={[gStyles.cardTitle, { color: colors.foreground }]}>{label}</Text>
      <Text style={[gStyles.bodyText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>{value}</Text>
    </View>
  );
}

function ChipCard({ title, items, color, bg, colors }: { title: string; items: string[]; color: string; bg: string; colors: any }) {
  return (
    <View style={[gStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[gStyles.cardTitle, { color: colors.foreground, marginBottom: 8 }]}>{title}</Text>
      <View style={gStyles.chips}>
        {items.map((s, i) => (
          <View key={i} style={[gStyles.chip, { backgroundColor: bg, borderColor: color + "30" }]}>
            <Text style={[gStyles.chipText, { color }]}>{s}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function FormatTab({ result, colors }: { result: AnalysisResult; colors: any }) {
  const fmt = result.formatting;
  const sec = result.sections;
  const av = result.action_verbs;
  return (
    <View style={{ gap: 10 }}>
      {fmt && (
        <View style={[gStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Text style={[gStyles.cardTitle, { color: colors.foreground }]}>ATS Format</Text>
            <View style={[gStyles.badge, { backgroundColor: fmt.ats_friendly ? "#10B98120" : "#EF444420" }]}>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: fmt.ats_friendly ? "#10B981" : "#EF4444" }}>
                {fmt.ats_friendly ? "ATS Friendly" : "Issues Found"}
              </Text>
            </View>
          </View>
          {fmt.issues?.length > 0 ? (
            fmt.issues.map((issue, i) => (
              <View key={i} style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                <Text style={[gStyles.bodyText, { color: colors.mutedForeground, flex: 1 }]}>{issue}</Text>
              </View>
            ))
          ) : (
            <Text style={[gStyles.bodyText, { color: "#10B981" }]}>No format issues detected.</Text>
          )}
        </View>
      )}
      {sec && (
        <View style={[gStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[gStyles.cardTitle, { color: colors.foreground, marginBottom: 8 }]}>Resume Sections</Text>
          <Text style={[gStyles.bodyText, { color: colors.mutedForeground, marginBottom: 4 }]}>Found: {sec.found?.join(", ") || "None detected"}</Text>
          {sec.missing?.length > 0 && (
            <Text style={[gStyles.bodyText, { color: colors.destructive }]}>Missing: {sec.missing.join(", ")}</Text>
          )}
        </View>
      )}
      {av && (
        <View style={[gStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[gStyles.cardTitle, { color: colors.foreground, marginBottom: 8 }]}>Action Verbs</Text>
          {av.found?.length > 0 && (
            <View style={gStyles.chips}>
              {av.found.slice(0, 15).map((v, i) => (
                <View key={i} style={[gStyles.chip, { backgroundColor: "#10B98115", borderColor: "#10B98130" }]}>
                  <Text style={[gStyles.chipText, { color: "#10B981" }]}>{v}</Text>
                </View>
              ))}
            </View>
          )}
          {av.weak_verbs?.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Text style={[gStyles.bodyText, { color: "#F59E0B", marginBottom: 4 }]}>Replace these weak verbs:</Text>
              <View style={gStyles.chips}>
                {av.weak_verbs.map((v, i) => (
                  <View key={i} style={[gStyles.chip, { backgroundColor: "#F59E0B15", borderColor: "#F59E0B30" }]}>
                    <Text style={[gStyles.chipText, { color: "#F59E0B" }]}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: any) {
  return StyleSheet.create({
    center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
    loadingText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.mutedForeground },
    errorText: { fontSize: 15, fontFamily: "Inter_400Regular", color: colors.destructive, textAlign: "center" },
    backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10, marginTop: 8 },
    backBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
    header: {
      flexDirection: "row", alignItems: "center", paddingHorizontal: 16,
      paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backIcon: { marginRight: 8, padding: 4 },
    headerTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    headerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
    scoreBanner: {
      flexDirection: "row", alignItems: "center", padding: 16, gap: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    subScoreGrid: { flex: 1, flexWrap: "wrap", flexDirection: "row", gap: 6 },
    subScoreItem: { width: "47%", borderRadius: 8, padding: 8 },
    subScoreVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
    subScoreLabel: { fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 13, marginTop: 2 },
    tabBar: { maxHeight: 44, borderBottomWidth: StyleSheet.hairlineWidth },
    tab: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
    tabText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  });
}

const gStyles = StyleSheet.create({
  sectionTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, padding: 14 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  progressBg: { height: 6, borderRadius: 3 },
  progressFill: { height: 6, borderRadius: 3 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  bodyText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
});
