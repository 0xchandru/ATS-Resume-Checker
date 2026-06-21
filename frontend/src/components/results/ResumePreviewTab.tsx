import { FileText, CheckCircle2 } from "lucide-react";
import RichTextEditor from "../common/RichTextEditor";

interface Props {
  resumeText: string;
  keywords: any;
}

export default function ResumePreviewTab({ resumeText, keywords }: Props) {
  const { matched = [], missing = [] } = keywords || {};

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Resume Preview</h2>
          <p className="text-sm text-muted-foreground">This is how your resume was parsed by our ATS engine.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-emerald-500">{matched.length} keywords found</span>
        </div>
      </div>

      <div className="bg-card border border-border shadow-sm rounded-xl overflow-hidden">
        {resumeText ? (
          <RichTextEditor value={resumeText} readOnly={true} minHeight="500px" />
        ) : (
          <div className="p-6 md:p-8 text-muted-foreground italic">No resume text available</div>
        )}
      </div>
    </div>
  );
}
