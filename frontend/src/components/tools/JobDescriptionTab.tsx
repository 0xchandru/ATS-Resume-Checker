import { useState } from "react";
import { Edit3, RefreshCw } from "lucide-react";
import RichTextEditor from "../common/RichTextEditor";

interface Props {
  jdText: string;
  keywords: any;
  onRescanWithNewJD?: (jd: string) => void;
  isRescanning?: boolean;
}

export default function JobDescriptionTab({ jdText, keywords, onRescanWithNewJD, isRescanning }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(jdText);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/25 inline-block border border-emerald-500/40" />
            Matched in resume
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-red-500/25 inline-block border border-red-500/40" />
            Missing from resume
          </span>
        </div>
        <button
          onClick={() => { setEditing(!editing); setDraft(jdText); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300 bg-violet-500/8 border border-violet-500/15 rounded-lg hover:bg-violet-500/12 transition-colors"
        >
          <Edit3 className="h-3.5 w-3.5" />
          Update scan information
        </button>
      </div>

      {editing && (
        <div className="mb-5 p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <label className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest block mb-2">
            Edit Job Description
          </label>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden mb-3">
            <RichTextEditor
              value={draft}
              onChange={setDraft}
              placeholder="Paste updated job description…"
              minHeight="200px"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-white/[0.04] border border-white/[0.07] rounded-lg hover:bg-white/[0.07] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onRescanWithNewJD?.(draft); setEditing(false); }}
              disabled={isRescanning || draft.trim().length < 50}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-500 text-white text-xs font-bold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity shadow-md shadow-violet-500/20"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRescanning ? "animate-spin" : ""}`} />
              {isRescanning ? "Rescanning…" : "Rescan with Updated JD"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
        <RichTextEditor value={jdText} readOnly={true} minHeight="400px" />
      </div>
    </div>
  );
}
