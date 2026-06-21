interface Props {
  jdLevel: string;
  resumeLevel: string;
  gapSeverity: string;
}

export default function SeniorityBadge({ jdLevel, resumeLevel, gapSeverity }: Props) {
  const isMatch = gapSeverity === "none";
  const color = gapSeverity === "critical" ? "text-red-500 border-red-500/30 bg-red-500/10" : 
                gapSeverity === "significant" ? "text-orange-500 border-orange-500/30 bg-orange-500/10" :
                gapSeverity === "minor" ? "text-amber-500 border-amber-500/30 bg-amber-500/10" :
                "text-emerald-500 border-emerald-500/30 bg-emerald-500/10";
                
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl border ${color}`}>
      <div className="flex flex-col">
        <span className="text-[10px] uppercase font-bold opacity-70">Resume Level</span>
        <span className="text-sm font-bold capitalize">{resumeLevel}</span>
      </div>
      <div className="text-lg opacity-50 font-bold">→</div>
      <div className="flex flex-col text-right">
        <span className="text-[10px] uppercase font-bold opacity-70">Role Requires</span>
        <span className="text-sm font-bold capitalize">{jdLevel}</span>
      </div>
    </div>
  );
}
