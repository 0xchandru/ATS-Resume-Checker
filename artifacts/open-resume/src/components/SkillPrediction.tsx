import { Cpu } from "lucide-react";

interface Props {
  prediction: any;
}

export default function SkillPrediction({ prediction }: Props) {
  if (!prediction?.predictions?.length) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
        <Cpu className="h-5 w-5 text-blue-500" /> Skill Gap Predictions
      </h2>
      <p className="text-sm text-slate-500 mb-5">
        Based on O*NET co-occurrence data for <span className="font-medium text-slate-700">{prediction.occupation_matched}</span> — skills that typically appear alongside your existing skill set.
      </p>

      <div className="space-y-3">
        {prediction.predictions.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{p.skill}</p>
              <p className="text-xs text-slate-500 truncate">{p.reason}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="flex items-center gap-1">
                <div className="w-16 h-2 bg-slate-200 rounded-full">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.round(p.confidence * 100)}%` }} />
                </div>
                <span className="text-xs font-bold text-blue-600">{Math.round(p.confidence * 100)}%</span>
              </div>
              <p className="text-xs text-slate-400 text-right mt-0.5">confidence</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Source: {prediction.source?.replace(/_/g, " ")} · These skills co-occur in the matched O*NET occupation profile.
      </p>
    </div>
  );
}
