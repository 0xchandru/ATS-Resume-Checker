import { CheckCircle2, XCircle, Info, Zap, Link2, ExternalLink } from "lucide-react";
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

function CheckGroup({ title, tooltip, items, children }: {
  title: string;
  tooltip?: string;
  items: { passed: boolean; description: string }[];
  children?: React.ReactNode;
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
      {children}
    </div>
  );
}

function LinkBadge({ text, url }: { text: string; url: string }) {
  const domain = (() => {
    try { return new URL(url).hostname.replace("www.", ""); } catch { return url; }
  })();

  const color = (() => {
    if (/linkedin/i.test(url)) return "text-blue-400 border-blue-500/20 bg-blue-500/8";
    if (/github/i.test(url)) return "text-purple-400 border-purple-500/20 bg-purple-500/8";
    if (/tryhackme/i.test(url)) return "text-red-400 border-red-500/20 bg-red-500/8";
    return "text-indigo-400 border-indigo-500/20 bg-indigo-500/8";
  })();

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      data-testid={`link-badge-${text.toLowerCase().replace(/\s+/g, "-")}`}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${color} hover:opacity-80 transition-opacity`}
    >
      <Link2 className="h-3 w-3 shrink-0" />
      <span>{text || domain}</span>
      <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
    </a>
  );
}

export default function SearchabilitySection({ result }: Props) {
  const { sections, keywords, extracted_links } = result;
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

  // Deduplicate extracted links by URL
  const uniqueLinks = extracted_links
    ? [...new Map(extracted_links.map(l => [l.url, l])).values()]
    : [];

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

      {/* Extracted hyperlinks panel */}
      {uniqueLinks.length > 0 && (
        <div className="mb-5 p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="h-4 w-4 text-indigo-400" />
            <h4 className="text-sm font-bold text-foreground">Hyperlinks Extracted from Resume</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {uniqueLinks.length} found
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            These clickable links were detected inside your PDF and are included in the ATS analysis.
          </p>
          <div className="flex flex-wrap gap-2">
            {uniqueLinks.map((lnk, i) => (
              <LinkBadge key={i} text={lnk.text} url={lnk.url} />
            ))}
          </div>
        </div>
      )}

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
