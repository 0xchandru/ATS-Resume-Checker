import { CheckCircle2, XCircle, Info, Zap } from "lucide-react";
import { AnalysisResult } from "../../App";

interface Props {
  result: AnalysisResult;
}

function CheckRow({ passed, description }: { passed: boolean; description: string }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0">
      {passed ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
      )}
      <p className="text-sm text-foreground/80 leading-snug">{description}</p>
    </div>
  );
}

function CheckGroup({ title, tooltip, items }: {
  title: string;
  tooltip?: string;
  items: { passed: boolean; description: string }[];
}) {
  const passCount = items.filter(i => i.passed).length;
  return (
    <div className="py-3 border-b border-white/[0.05] last:border-0">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold text-foreground">{title}</h4>
          {tooltip && <Info className="h-3.5 w-3.5 text-muted-foreground" title={tooltip} />}
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
          passCount === items.length
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : passCount === 0
            ? "bg-red-500/10 text-red-400 border-red-500/20"
            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
        }`}>
          {passCount}/{items.length}
        </span>
      </div>
      <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-4">
        {items.map((item, i) => (
          <CheckRow key={i} {...item} />
        ))}
      </div>
    </div>
  );
}

export default function SearchabilitySection({ result }: Props) {
  const { sections, keywords } = result;
  const detected = sections?.detected || [];
  const detectedNames = new Set(detected.map((s: any) => s.name));

  const hasEmail = detectedNames.has("contact_info");
  const hasPhone = hasEmail;
  const hasAddress = hasEmail;
  const hasEducation = detectedNames.has("education");
  const hasExperience = detectedNames.has("experience");
  const hasSummary = detectedNames.has("summary");
  const hasSkills = detectedNames.has("skills");
  const matchRate = keywords?.match_rate ? Math.round(keywords.match_rate * 100) : 0;
  const hasJobTitleMatch = matchRate >= 30;

  const allChecks = [hasEmail, hasPhone, hasAddress, hasEducation, hasExperience, hasSummary, hasSkills, hasJobTitleMatch];
  const passedTotal = allChecks.filter(Boolean).length;
  const totalChecks = allChecks.length;

  return (
    <div id="searchability" className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-black text-foreground">Searchability</h2>
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-500/15 text-amber-400 border border-amber-500/25 rounded-full">
          IMPORTANT
        </span>
        <span className="text-xs text-muted-foreground ml-auto">{passedTotal}/{totalChecks} checks passed</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        ATS systems are used by 90%+ of companies to screen resumes. Fix any red issues below to improve your search visibility.
      </p>

      <div className="flex items-start gap-2.5 p-3.5 bg-amber-500/8 border border-amber-500/15 rounded-xl mb-5">
        <Zap className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-xs text-foreground/80">
          <strong className="text-foreground">Tip:</strong> Fix the red items to ensure your resume is correctly parsed and easily found by recruiters.
        </p>
      </div>

      <div className="space-y-0">
        <CheckGroup
          title="Contact Information"
          tooltip="Recruiters use your contact info to validate location and reach out."
          items={[
            { passed: hasAddress, description: "Physical address or location provided. Helps validate location for job matches." },
            { passed: hasEmail, description: "Email address detected. Primary contact method for recruiters." },
            { passed: hasPhone, description: "Phone number detected." },
          ]}
        />
        <CheckGroup
          title="Professional Summary"
          tooltip="A summary helps recruiters quickly understand your qualifications."
          items={[
            {
              passed: hasSummary,
              description: hasSummary
                ? "Summary section detected. Gives hiring managers a quick overview of your value."
                : "No summary found. Add a 2-4 sentence summary targeting this role.",
            },
          ]}
        />
        <CheckGroup
          title="Section Headings"
          tooltip="Standard headings ensure ATS can correctly structure your resume."
          items={[
            { passed: hasEducation, description: hasEducation ? "Education section found." : "Education section missing — include it." },
            { passed: hasExperience, description: hasExperience ? "Work experience section found." : "Work experience section missing — critical for ATS." },
            { passed: hasSkills, description: hasSkills ? "Skills section found." : "Skills section missing — add a dedicated skills list." },
          ]}
        />
        <CheckGroup
          title="Job Title Match"
          tooltip="Matching job title keywords improves recruiter search visibility."
          items={[
            {
              passed: hasJobTitleMatch,
              description: hasJobTitleMatch
                ? `Good keyword alignment (${matchRate}%). Your resume keywords match this role.`
                : `Low keyword match (${matchRate}%). Add the target job title to your resume summary.`,
            },
          ]}
        />
      </div>
    </div>
  );
}
