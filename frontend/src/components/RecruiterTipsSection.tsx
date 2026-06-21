import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Zap } from "lucide-react";

interface Props {
  feedback: any[];
  actionVerbs: any;
  formatting: any;
  subScores: Record<string, any>;
}

interface TipItemProps {
  passed: boolean;
  title: string;
  description: string;
  action?: string;
  before?: string;
  after?: string;
}

function TipItem({ passed, title, description, action, before, after }: TipItemProps) {
  return (
    <div className="py-4 border-b border-border/50 last:border-0">
      <div className="flex items-start gap-3">
        {passed ? (
          <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-foreground mb-1">{title}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

          {action && (
            <div className="mt-2 flex items-start gap-2 p-3 bg-primary/5 border border-primary/15 rounded-lg">
              <ArrowRight className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs text-foreground/80 leading-relaxed">{action}</p>
            </div>
          )}

          {before && after && (
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-xs font-bold text-red-400 mb-1 uppercase tracking-wide">Before</p>
                <p className="text-xs text-foreground/80 italic">"{before}"</p>
              </div>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-xs font-bold text-emerald-400 mb-1 uppercase tracking-wide">After</p>
                <p className="text-xs text-foreground/80">"{after}"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RecruiterTipsSection({ feedback, actionVerbs, formatting, subScores }: Props) {
  // Measurable results check
  const impactScore = subScores?.impact_quantification?.score || 0;
  const quantifiedBullets = subScores?.impact_quantification?.quantified_bullets || 0;
  const totalBullets = subScores?.impact_quantification?.total_experience_bullets || 0;
  const hasGoodQuantification = impactScore >= 50;

  // Action verb quality
  const strongRatio = actionVerbs?.strong_verb_ratio || 0;
  const hasStrongVerbs = strongRatio >= 0.6;
  const weakVerbs = actionVerbs?.weak_verbs || [];

  // Resume length check
  const wordCount = formatting?.word_count || 0;
  const pageCount = formatting?.page_count || 0;
  const hasGoodLength = wordCount >= 300 && wordCount <= 1200;

  // File format check
  const fileType = formatting?.file_type || "pdf";
  const isGoodFormat = fileType === "pdf" || fileType === "docx";

  // Build before/after for weak verbs
  let beforeAfter: { before: string; after: string } | undefined;
  if (weakVerbs.length > 0) {
    const wv = weakVerbs[0];
    const replacements: Record<string, string> = {
      "worked": "Engineered",
      "helped": "Facilitated",
      "assisted": "Supported",
      "did": "Executed",
      "made": "Developed",
      "used": "Leveraged",
    };
    const replacement = replacements[wv.verb] || "Engineered";
    beforeAfter = {
      before: wv.context || `${wv.verb} on the project...`,
      after: `${replacement} [specific process], resulting in [measurable outcome]`,
    };
  }

  // Get critical/important feedback items
  const criticalFeedback = feedback?.filter((f: any) => f.priority === "critical") || [];
  const importantFeedback = feedback?.filter((f: any) => f.priority === "important") || [];

  return (
    <div id="recruiter-tips" className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-black text-foreground">Recruiter Tips</h2>
        {(criticalFeedback.length + importantFeedback.length) > 0 && (
          <span className="text-xs text-muted-foreground font-medium bg-muted px-2.5 py-1 rounded-lg">
            {criticalFeedback.length + importantFeedback.length} improvement{(criticalFeedback.length + importantFeedback.length) > 1 ? "s" : ""} suggested
          </span>
        )}
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
        These tips go beyond ATS compliance — they reflect what recruiters and hiring managers actually look for when reviewing resumes manually.
      </p>

      <div className="bg-muted/30 rounded-xl overflow-hidden">
        <TipItem
          passed={hasGoodQuantification}
          title="Measurable Results"
          description={
            hasGoodQuantification
              ? `${quantifiedBullets} of ${totalBullets} experience bullets contain quantified impact. Great job!`
              : `Only ${quantifiedBullets} of ${totalBullets} experience bullets contain metrics. Recruiters weight quantified impact heavily.`
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
              ? `${Math.round(strongRatio * 100)}% of your verbs are strong action verbs. Excellent!`
              : `Only ${Math.round(strongRatio * 100)}% of your verbs are strong. Replace generic verbs like "${weakVerbs[0]?.verb || 'worked'}" with impactful alternatives.`
          }
          action={!hasStrongVerbs ? actionVerbs?.suggestions?.[0] : undefined}
        />

        <TipItem
          passed={hasGoodLength}
          title="Resume Length"
          description={
            wordCount < 300
              ? `Your resume is ${wordCount} words — too short. Most successful resumes are 400-800 words for entry-level, 600-1000 for mid-level.`
              : wordCount > 1200
              ? `Your resume is ${wordCount} words (${pageCount} page${pageCount > 1 ? "s" : ""}). Consider trimming to the most relevant content.`
              : `Your resume is ${wordCount} words (${pageCount} page${pageCount > 1 ? "s" : ""}). Good length!`
          }
        />

        <TipItem
          passed={isGoodFormat}
          title="File Format"
          description={
            isGoodFormat
              ? "Your resume is in a compatible format. PDF and DOCX are the most ATS-friendly formats."
              : "Consider saving your resume as PDF or DOCX for maximum ATS compatibility."
          }
        />
      </div>

      {/* Critical issues */}
      {criticalFeedback.length > 0 && (
        <div className="mt-5">
          <h4 className="text-sm font-bold text-red-500 mb-3 flex items-center gap-2">
            <XCircle className="h-4 w-4" />
            Critical Issues ({criticalFeedback.length})
          </h4>
          <div className="space-y-2">
            {criticalFeedback.slice(0, 5).map((f: any, i: number) => (
              <div key={i} className="flex items-start gap-3 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-foreground font-medium">{f.message}</p>
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
