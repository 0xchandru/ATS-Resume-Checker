import { Cpu } from "lucide-react";

interface Props {
  prediction: any;
}

export default function SkillPrediction({ prediction }: Props) {
  if (!prediction?.predictions?.length) return null;

  return (
    <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6">
      <h2 className="text-xl font-black text-foreground mb-1.5 flex items-center gap-2">
        <Cpu className="h-5 w-5 text-violet-400" /> Skill Gap Predictions
      </h2>
      <p className="text-sm text-muted-foreground mb-5">
        Based on O*NET co-occurrence data for{" "}
        <span className="font-semibold text-foreground/80">{prediction.occupation_matched}</span> — skills that typically appear alongside your existing skill set.
      </p>

      <div className="space-y-2.5">
        {prediction.predictions.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-3 p-3.5 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.03] transition-colors">
            <div className="shrink-0 w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <span className="text-xs font-black text-violet-400">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground/90">{p.skill}</p>
              <p className="text-xs text-muted-foreground truncate leading-snug">{p.reason}</p>
            </div>
            <div className="shrink-0 text-right">
              <div className="flex items-center gap-1.5">
                <div className="w-14 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.round(p.confidence * 100)}%` }} />
                </div>
                <span className="text-xs font-bold text-violet-400 tabular-nums">{Math.round(p.confidence * 100)}%</span>
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-right mt-0.5">confidence</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground/40">
        Source: {prediction.source?.replace(/_/g, " ")} · Skills co-occur in the matched O*NET occupation profile.
      </p>
    </div>
  );
}
