import { CheckCircle2, XCircle, AlertTriangle, ArrowRight } from "lucide-react";

interface Props {
  feedback: any[];
  actionVerbs: any;
  formatting: any;
  subScores: Record<string, any>;
}

function TipItem({ passed, title, description, action, before, after }: {
  passed: boolean;
  title: string;
  description: string;
  action?: string;
  before?: string;
  after?: string;
}) {
  return (
    <div className="py-4 border-b border-white/[0.04] last:border-0">
      <div className="flex items-start gap-3">
        {passed ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground mb-0.5">{title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
          {action && (
            <div className="mt-2 flex items-start gap-2 p-3 bg-violet-500/8 border border-violet-500/15 rounded-lg">
              <ArrowRight className="h-3.5 w-3.5 text-violet-400 mt-0.5 shrink-0" />
              <p className="text-xs text-foreground/75 leading-relaxed">{action}</p>
            </div>
          )}
          {before && after && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 bg-red-500/8 border border-red-500/15 rounded-lg">
                <p className="text-[10px] font-bold text-red-400 mb-1 uppercase tracking-wide">Before</p>
                <p className="text-xs text-foreground/75 italic">"{before}"</p>
              </div>
              <div className="p-3 bg-emerald-500/8 border border-emerald-500/15 rounded-lg">
                <p className="text-[10px] font-bold text-emerald-400 mb-1 uppercase tracking-wide">After</p>
                <p className="text-xs text-foreground/75">"{after}"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecruiterTipsSection({ feedback, actionVerbs, formatting, subScores }: Props) {
  const impactScore = subScores?.impact_quantification?.score || 0;
  const quantifiedBullets = subScores?.impact_quantification?.quantified_bullets || 0;
  const totalBullets = subScores?.impact_quantification?.total_experience_bullets || 0;
  const hasGoodQuantification = impactScore >= 50;

  const strongRatio = actionVerbs?.strong_verb_ratio || 0;
  const hasStrongVerbs = strongRatio >= 0.6;
  const weakVerbs = actionVerbs?.weak_verbs || [];

  const wordCount = formatting?.word_count || 0;
  const pageCount = formatting?.page_count || 0;
  const hasGoodLength = wordCount >= 300 && wordCount <= 1200;

  const fileType = formatting?.file_type || "pdf";
  const isGoodFormat = fileType === "pdf" || fileType === "docx";

  let beforeAfter: { before: string; after: string } | undefined;
  if (weakVerbs.length > 0) {
    const wv = weakVerbs[0];
    const replacements: Record<string, string> = {
      "worked": "Engineered", "helped": "Facilitated", "assisted": "Supported",
      "did": "Executed", "made": "Developed", "used": "Leveraged",
    };
    const replacement = replacements[wv.verb] || "Engineered";
    beforeAfter = {
      before: wv.context || `${wv.verb} on the project...`,
      after: `${replacement} [specific process], resulting in [measurable outcome]`,
    };
  }

  const criticalFeedback = feedback?.filter((f: any) => f.priority === "critical") || [];

  const passCount = [hasGoodQuantification, hasStrongVerbs, hasGoodLength, isGoodFormat].filter(Boolean).length;

  return (
    <div id="recruiter-tips" className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-black text-foreground">Recruiter Tips</h2>
        <span className="text-xs text-muted-foreground ml-auto">
          {passCount}/4 passing
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        Beyond ATS compliance — what recruiters and hiring managers actually look for when reviewing manually.
      </p>

      <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4">
        <TipItem
          passed={hasGoodQuantification}
          title="Measurable Results"
          description={
            hasGoodQuantification
              ? `${quantifiedBullets} of ${totalBullets} bullets contain quantified impact. Great job!`
              : `Only ${quantifiedBullets} of ${totalBullets} bullets have metrics. Recruiters heavily weight quantified impact.`
          }
          action={!hasGoodQuantification ? "Add numbers: percentages, dollar amounts, team sizes, user counts, or time saved." : undefined}
          before={beforeAfter?.before}
          after={beforeAfter?.after}
        />
        <TipItem
          passed={hasStrongVerbs}
          title="Action Verb Quality"
          description={
            hasStrongVerbs
              ? `${Math.round(strongRatio * 100)}% strong action verbs. Excellent!`
              : `Only ${Math.round(strongRatio * 100)}% strong verbs. Replace "${weakVerbs[0]?.verb || 'worked'}" with impactful alternatives.`
          }
          action={!hasStrongVerbs ? actionVerbs?.suggestions?.[0] : undefined}
        />
        <TipItem
          passed={hasGoodLength}
          title="Resume Length"
          description={
            wordCount < 300
              ? `${wordCount} words — too short. Target 400-800 words for entry-level, 600-1000 for mid-level.`
              : wordCount > 1200
              ? `${wordCount} words (${pageCount}p). Consider trimming to the most relevant content.`
              : `${wordCount} words (${pageCount}p). Good length.`
          }
        />
        <TipItem
          passed={isGoodFormat}
          title="File Format"
          description={
            isGoodFormat
              ? "PDF/DOCX format. Both are ATS-compatible."
              : "Save as PDF or DOCX for maximum ATS compatibility."
          }
        />
      </div>

      {criticalFeedback.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-bold text-red-400 mb-2 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Critical Issues ({criticalFeedback.length})
          </h4>
          <div className="space-y-2">
            {criticalFeedback.slice(0, 5).map((f: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-red-500/8 border border-red-500/15 rounded-xl">
                <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-foreground/85">{f.message}</p>
                  {f.action && <p className="text-xs text-muted-foreground mt-1">→ {f.action}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
