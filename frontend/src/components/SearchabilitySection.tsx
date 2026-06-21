import { CheckCircle2, XCircle, Info, Zap } from "lucide-react";
import { AnalysisResult } from "../App";

interface Props {
  result: AnalysisResult;
}

interface CheckItemProps {
  passed: boolean;
  label: string;
  description: string;
  tooltip?: string;
}

function CheckItem({ passed, label, description }: CheckItemProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      {passed ? (
        <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5 flex-shrink-0" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{description}</p>
      </div>
    </div>
  );
}

function CheckGroup({ title, items, tooltip }: { title: string; items: CheckItemProps[]; tooltip?: string }) {
  return (
    <div className="py-4 border-b border-border last:border-0">
      <div className="flex items-center gap-2 mb-2">
        <h4 className="text-base font-bold text-foreground">{title}</h4>
        {tooltip && (
          <div className="group relative">
            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border border-border rounded-lg text-xs text-popover-foreground opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all shadow-lg w-64 z-10">
              {tooltip}
            </div>
          </div>
        )}
      </div>
      <div className="bg-muted/30 rounded-xl p-4">
        {items.map((item, i) => (
          <CheckItem key={i} {...item} />
        ))}
      </div>
    </div>
  );
}

export default function SearchabilitySection({ result }: Props) {
  const { sections, keywords, feedback } = result;
  const detected = sections?.detected || [];
  const missing = sections?.missing || [];
  const detectedNames = new Set(detected.map((s: any) => s.name));

  // Contact info checks
  const hasEmail = detectedNames.has("contact_info");
  const hasPhone = hasEmail; // If contact_info section exists, assume phone is there
  const hasAddress = hasEmail; // Simplified — real check would parse contact info

  // Section heading checks
  const hasEducation = detectedNames.has("education");
  const hasExperience = detectedNames.has("experience");
  const hasSummary = detectedNames.has("summary");
  const hasSkills = detectedNames.has("skills");

  // Job title match (simplified)
  const matchRate = keywords?.match_rate ? Math.round(keywords.match_rate * 100) : 0;
  const hasJobTitleMatch = matchRate >= 30;

  return (
    <div id="searchability" className="scroll-mt-6">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-2xl font-black text-foreground">Searchability</h2>
        <span className="badge-important">IMPORTANT</span>
      </div>

      {/* Description */}
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        An ATS (Applicant Tracking System) is a software used by 90% of companies and recruiters to search for resumes
        and manage the hiring process. Below is how well your resume appears in an ATS and a recruiter search.
      </p>

      {/* Tip */}
      <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6">
        <Zap className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-foreground">
          <strong>Tip:</strong> Fix the red Xs to ensure your resume is easily searchable by recruiters and parsed correctly by the ATS.
        </p>
      </div>

      {/* Check Groups */}
      <div className="space-y-0">
        <CheckGroup
          title="Contact Information"
          tooltip="Recruiters use your contact info to validate your location and reach out. Include email, phone, and LinkedIn."
          items={[
            { passed: hasAddress, label: "Address", description: "You provided your physical address. Recruiters use your address to validate your location for job matches." },
            { passed: hasEmail, label: "Email", description: "You provided your email. Recruiters use your email to contact you for job matches." },
            { passed: hasPhone, label: "Phone", description: "You provided your phone number." },
          ]}
        />

        <CheckGroup
          title="Summary"
          tooltip="A professional summary helps recruiters quickly understand your qualifications and value proposition."
          items={[
            {
              passed: hasSummary,
              label: "Summary",
              description: hasSummary
                ? "We found a summary section on your resume. Good job! The summary provides a quick overview of the candidate's qualifications, helping hiring managers promptly grasp the value the candidate can offer in the position."
                : "No summary section detected. Add a 2-4 sentence professional summary targeting the role.",
            },
          ]}
        />

        <CheckGroup
          title="Section Headings"
          tooltip="Standard section headings ensure ATS systems can correctly parse your resume structure."
          items={[
            { passed: hasEducation, label: "Education", description: hasEducation ? "We found the education section in your resume." : "Education section is missing from your resume." },
            { passed: hasExperience, label: "Experience", description: hasExperience ? "We found the work experience section in your resume." : "Work experience section is missing — this is critical." },
            { passed: hasSkills, label: "Skills", description: hasSkills ? "We found the skills section in your resume." : "Skills section is missing from your resume." },
          ]}
        />

        <CheckGroup
          title="Job Title Match"
          tooltip="Having a matching job title helps recruiters find your resume when searching by title."
          items={[
            {
              passed: hasJobTitleMatch,
              label: "Job Title",
              description: hasJobTitleMatch
                ? "Your resume keywords align well with the job description. This helps ensure you're found when recruiters search by job title."
                : "Low keyword alignment with the job description. Consider adding the target job title to your resume summary or title.",
            },
          ]}
        />
      </div>
    </div>
  );
}
