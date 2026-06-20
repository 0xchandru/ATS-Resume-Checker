import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { uploadAndAnalyze } from "@/utils/api";
import { useAnalysis } from "@/context/AnalysisContext";

const EXAMPLE_JD = `We are looking for a Software Engineer with 3+ years of experience in TypeScript, React, and Node.js. 
Responsibilities include building scalable APIs, writing unit tests, and collaborating in an Agile environment. 
Experience with AWS, Docker, and PostgreSQL is a plus.`;

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { setCurrentResult } = useAnalysis();

  const [file, setFile] = useState<{ name: string; uri: string; mimeType: string } | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");

  const headerPaddingTop = Platform.OS === "web"
    ? 67 + insets.top
    : insets.top + 16;

  const tabBarOffset = Platform.OS === "web" ? 84 + 34 : 80;

  async function pickDocument() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/msword",
          "text/plain",
        ],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setFile({
          name: asset.name,
          uri: asset.uri,
          mimeType: asset.mimeType ?? "application/octet-stream",
        });
        setError("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e: any) {
      setError("Could not open document picker: " + e.message);
    }
  }

  async function analyze() {
    if (!file) { setError("Please select a resume file."); return; }
    if (!jobDescription.trim()) { setError("Please enter a job description."); return; }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setAnalyzing(true);
    setError("");

    try {
      const result = await uploadAndAnalyze(
        file.uri,
        file.name,
        file.mimeType,
        jobDescription.trim(),
        (s) => setStage(s)
      );
      setCurrentResult(result);
      router.push(`/results?id=${result.scan_id}`);
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e.message ?? "Analysis failed. Is the backend running?");
    } finally {
      setAnalyzing(false);
      setStage("");
    }
  }

  const canAnalyze = !!file && !!jobDescription.trim() && !analyzing;
  const s = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[s.header, { paddingTop: headerPaddingTop, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[s.headerTitle, { color: colors.foreground }]}>ATS Checker</Text>
        <Text style={[s.headerSub, { color: colors.mutedForeground }]}>Upload your resume and job description</Text>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: tabBarOffset + 16 }}
      >
        <Pressable
          onPress={pickDocument}
          style={({ pressed }) => [
            s.uploadBox,
            {
              borderColor: file ? colors.primary : colors.border,
              backgroundColor: file ? colors.primary + "08" : colors.card,
              opacity: pressed ? 0.75 : 1,
            },
          ]}
        >
          {file ? (
            <View style={s.fileInfo}>
              <View style={[s.fileIcon, { backgroundColor: colors.primary + "15" }]}>
                <Ionicons name="document-text" size={28} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.fileName, { color: colors.foreground }]} numberOfLines={2}>{file.name}</Text>
                <Text style={[s.fileMeta, { color: colors.mutedForeground }]}>
                  {file.mimeType?.includes("pdf") ? "PDF" : file.mimeType?.includes("word") ? "DOCX" : "Document"}
                  {" · Tap to change"}
                </Text>
              </View>
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            </View>
          ) : (
            <View style={{ alignItems: "center", gap: 10 }}>
              <View style={[s.uploadIcon, { backgroundColor: colors.muted }]}>
                <Ionicons name="cloud-upload-outline" size={32} color={colors.mutedForeground} />
              </View>
              <Text style={[s.uploadTitle, { color: colors.foreground }]}>Upload Resume</Text>
              <Text style={[s.uploadSub, { color: colors.mutedForeground }]}>PDF, DOCX, or TXT</Text>
            </View>
          )}
        </Pressable>

        <View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={[s.label, { color: colors.foreground }]}>Job Description</Text>
            {!jobDescription.trim() && (
              <Pressable
                onPress={() => setJobDescription(EXAMPLE_JD)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
              >
                <Ionicons name="flash-outline" size={12} color={colors.primary} />
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.primary }}>Fill example</Text>
              </Pressable>
            )}
          </View>
          <View style={[s.textAreaContainer, { borderColor: jobDescription ? colors.primary : colors.border, backgroundColor: colors.card }]}>
            <TextInput
              style={[s.textArea, { color: colors.foreground }]}
              placeholder="Paste the job description here..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              value={jobDescription}
              onChangeText={setJobDescription}
            />
            {!!jobDescription && (
              <Pressable
                style={{ position: "absolute", top: 10, right: 10 }}
                onPress={() => setJobDescription("")}
              >
                <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>
          <Text style={[s.charCount, { color: colors.mutedForeground }]}>
            {jobDescription.length} characters
          </Text>
        </View>

        {!!error && (
          <View style={[s.errorBox, { backgroundColor: colors.destructive + "12", borderColor: colors.destructive + "30" }]}>
            <Ionicons name="warning-outline" size={16} color={colors.destructive} />
            <Text style={[s.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}

        {analyzing && (
          <View style={[s.stageBox, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "25" }]}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[s.stageText, { color: colors.primary }]}>{stage || "Starting analysis..."}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            s.analyzeBtn,
            {
              backgroundColor: canAnalyze ? colors.primary : colors.muted,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={analyze}
          disabled={!canAnalyze}
        >
          <Ionicons name="analytics-outline" size={20} color={canAnalyze ? "#fff" : colors.mutedForeground} />
          <Text style={[s.analyzeBtnText, { color: canAnalyze ? "#fff" : colors.mutedForeground }]}>
            {analyzing ? "Analyzing..." : "Analyze Resume"}
          </Text>
        </Pressable>

        <View style={[s.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[s.tipsTitle, { color: colors.foreground }]}>Tips for best results</Text>
          {TIPS.map((tip, i) => (
            <View key={i} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start", marginTop: 8 }}>
              <Ionicons name={tip.icon as any} size={15} color={colors.accent} style={{ marginTop: 1 }} />
              <Text style={[s.tipText, { color: colors.mutedForeground }]}>{tip.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const TIPS = [
  { icon: "document-text-outline", text: "Use a clean, single-column resume format for best ATS parsing." },
  { icon: "text-outline", text: "Include the full job description — more context means better keyword matching." },
  { icon: "checkmark-circle-outline", text: "Use standard section headers: Experience, Education, Skills." },
];

function makeStyles(colors: any) {
  return StyleSheet.create({
    header: {
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
    headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
    uploadBox: {
      borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14,
      minHeight: 130, padding: 20, alignItems: "center", justifyContent: "center",
    },
    fileInfo: { flexDirection: "row", alignItems: "center", gap: 12, width: "100%" },
    fileIcon: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    fileName: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
    fileMeta: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
    uploadIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
    uploadTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    uploadSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
    label: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
    textAreaContainer: { borderWidth: 1.5, borderRadius: 12, padding: 12, minHeight: 130 },
    textArea: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, minHeight: 108, paddingRight: 24 },
    charCount: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "right", marginTop: 4 },
    errorBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
    errorText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 18 },
    stageBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 10, borderWidth: 1 },
    stageText: { fontSize: 13, fontFamily: "Inter_500Medium" },
    analyzeBtn: {
      paddingVertical: 15, borderRadius: 12,
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    },
    analyzeBtnText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
    tipsCard: {
      padding: 16, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth,
    },
    tipsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
    tipText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, flex: 1 },
  });
}
