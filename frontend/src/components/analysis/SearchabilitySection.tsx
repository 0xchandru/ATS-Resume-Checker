import { CheckCircle2, XCircle, Info, Zap, Link2, ExternalLink } from "lucide-react";
import { AnalysisResult } from "../../App";

interface LinkEntry {
  text: string;
  url: string;
  page: number;
  rect?: number[];
  line_group?: string;
  separator?: string;
  position?: number;
}

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

function linkColor(url: string) {
  if (/linkedin/i.test(url))   return { badge: "text-blue-400 border-blue-500/20 bg-blue-500/8",   dot: "bg-blue-400"   };
  if (/github/i.test(url))     return { badge: "text-purple-400 border-purple-500/20 bg-purple-500/8", dot: "bg-purple-400" };
  if (/tryhackme/i.test(url))  return { badge: "text-red-400 border-red-500/20 bg-red-500/8",       dot: "bg-red-400"    };
  if (/twitter|x\.com/i.test(url)) return { badge: "text-sky-400 border-sky-500/20 bg-sky-500/8",  dot: "bg-sky-400"    };
  if (/kaggle/i.test(url))     return { badge: "text-cyan-400 border-cyan-500/20 bg-cyan-500/8",    dot: "bg-cyan-400"   };
  if (/leetcode/i.test(url))   return { badge: "text-amber-400 border-amber-500/20 bg-amber-500/8", dot: "bg-amber-400"  };
  return                               { badge: "text-indigo-400 border-indigo-500/20 bg-indigo-500/8", dot: "bg-indigo-400" };
}

function LinkBadge({ link }: { link: LinkEntry }) {
  const domain = (() => {
    try { return new URL(link.url).hostname.replace("www.", ""); } catch { return link.url; }
  })();
  const { badge, dot } = linkColor(link.url);
  const label = link.text || domain;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      title={link.url}
      data-testid={`link-badge-${label.toLowerCase().replace(/\s+/g, "-")}`}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${badge} hover:opacity-80 transition-opacity`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot} shrink-0`} />
      <span>{label}</span>
      <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
    </a>
  );
}

function SeparatorChip({ sep }: { sep: string }) {
  return (
    <span className="inline-flex items-center justify-center text-[11px] font-mono text-muted-foreground/50 px-1.5 select-none">
      {sep}
    </span>
  );
}

function LinkLineGroup({ links }: { links: LinkEntry[] }) {
  const sorted = [...links].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const sep = sorted.find(l => l.separator)?.separator || "|";

  return (
    <div className="flex flex-wrap items-center gap-y-1.5">
      {sorted.map((lnk, i) => (
        <span key={i} className="inline-flex items-center">
          <LinkBadge link={lnk} />
          {i < sorted.length - 1 && lnk.separator && (
            <SeparatorChip sep={lnk.separator} />
          )}
          {i < sorted.length - 1 && !lnk.separator && (
            <SeparatorChip sep={sep} />
          )}
        </span>
      ))}
    </div>
  );
}

function buildLineGroups(links: LinkEntry[]): Map<string, LinkEntry[]> {
  const groups = new Map<string, LinkEntry[]>();
  const ungroupedKey = "__ungrouped__";

  for (const lnk of links) {
    const key = lnk.line_group || ungroupedKey;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(lnk);
  }
  return groups;
}

function patternLabel(sep: string): string {
  const map: Record<string, string> = {
    "—": "em-dash separated",
    "–": "en-dash separated",
    "|": "pipe separated",
    "·": "bullet separated",
    "•": "bullet separated",
    "/": "slash separated",
    ",": "comma separated",
  };
  return map[sep.trim()] ?? "separated";
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

  const uniqueLinks = extracted_links
    ? [...new Map(extracted_links.map(l => [l.url, l])).values()]
    : [];

  const lineGroups = buildLineGroups(uniqueLinks);

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

      {/* ── Extracted hyperlinks panel ─────────────────────────────────── */}
      {uniqueLinks.length > 0 && (
        <div className="mb-5 border border-indigo-500/15 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-indigo-500/5 border-b border-indigo-500/10">
            <Link2 className="h-4 w-4 text-indigo-400 shrink-0" />
            <h4 className="text-sm font-bold text-foreground">Hyperlinks Extracted from Resume</h4>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {uniqueLinks.length} link{uniqueLinks.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* One row per line-group */}
          <div className="divide-y divide-white/[0.04]">
            {[...lineGroups.entries()].map(([groupKey, groupLinks], gi) => {
              const sortedGroup = [...groupLinks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
              const detectedSep = sortedGroup.find(l => l.separator)?.separator?.trim() || "";
              const isMulti = sortedGroup.length > 1;

              return (
                <div key={groupKey} className="px-4 py-3">
                  {/* Pattern badge for multi-link lines */}
                  {isMulti && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/50">
                        Line {gi + 1}
                      </span>
                      {detectedSep && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-muted-foreground">
                          splitter:&nbsp;<span className="text-foreground/70">&quot;{detectedSep}&quot;</span>
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground/40">
                        {isMulti ? patternLabel(detectedSep) : "single link"}
                        {" "}·{" "}{sortedGroup.length} link{sortedGroup.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}

                  {/* Visual replica of the link line */}
                  <LinkLineGroup links={sortedGroup} />

                  {/* URL list under each group */}
                  <div className="mt-2 space-y-0.5">
                    {sortedGroup.map((lnk, li) => (
                      <div key={li} className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground/40 w-20 shrink-0 truncate">{lnk.text || "—"}</span>
                        <span className="text-[10px] font-mono text-muted-foreground/60 truncate max-w-xs">{lnk.url}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-4 py-2.5 bg-white/[0.02] border-t border-white/[0.04]">
            <p className="text-[11px] text-muted-foreground/50">
              These URLs are included in the keyword analysis. Profiles and portfolios may contain additional context for ATS scoring.
            </p>
          </div>
        </div>
      )}

      {/* ── Standard checks ────────────────────────────────────────────── */}
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
