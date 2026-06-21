import { CheckCircle2, FileText } from "lucide-react";
import RichTextEditor from "../common/RichTextEditor";

interface Props {
  resumeText: string;
  keywords: any;
}

export default function ResumePreviewTab({ resumeText, keywords }: Props) {
  const { matched = [] } = keywords || {};

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground">Resume Preview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">This is how your resume was parsed by our ATS engine.</p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-500/8 px-3.5 py-2 rounded-xl border border-emerald-500/18">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-400">{matched.length} keywords found</span>
        </div>
      </div>

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        {resumeText ? (
          <RichTextEditor value={resumeText} readOnly={true} minHeight="500px" />
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <FileText className="w-8 h-8 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground italic text-sm">No resume text available</p>
          </div>
        )}
      </div>
    </div>
  );
}
