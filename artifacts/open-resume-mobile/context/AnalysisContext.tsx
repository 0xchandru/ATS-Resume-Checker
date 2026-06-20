import React, { createContext, useContext, useState } from "react";
import type { AnalysisResult } from "@/utils/api";

type AnalysisContextType = {
  currentResult: AnalysisResult | null;
  setCurrentResult: (r: AnalysisResult | null) => void;
};

const AnalysisContext = createContext<AnalysisContextType>({
  currentResult: null,
  setCurrentResult: () => {},
});

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  return (
    <AnalysisContext.Provider value={{ currentResult, setCurrentResult }}>
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  return useContext(AnalysisContext);
}
