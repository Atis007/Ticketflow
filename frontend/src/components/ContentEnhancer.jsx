import { useEffect, useState } from "react";

import { enhanceContent } from "@/admin/api/ai.api";

export default function ContentEnhancer({ title, description, token, onAccept, onClose }) {
  const [enhanced, setEnhanced] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError(null);
      try {
        const result = await enhanceContent({ token, title, description });
        if (!cancelled) {
          setEnhanced(result?.enhanced ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "AI enhancement failed. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-2 rounded-xl border border-accent-purple/20 bg-accent-purple/5 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-base text-accent-purple">auto_awesome</span>
        <span className="text-sm font-medium text-white">AI Content Enhancer</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-base text-accent-purple">progress_activity</span>
          <p className="text-sm text-text-muted">Enhancing with AI...</p>
        </div>
      )}

      {error && (
        <>
          <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setError(null); setLoading(true); setEnhanced(null); enhanceContent({ token, title, description }).then(r => { setEnhanced(r?.enhanced ?? null); setLoading(false); }).catch(e => { setError(e?.message || "AI enhancement failed."); setLoading(false); }); }}
              className="inline-flex items-center gap-1 rounded-full border border-accent-purple/30 bg-accent-purple/10 px-3 py-1.5 text-xs font-semibold text-accent-purple hover:bg-accent-purple/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Retry
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-text-soft hover:text-white transition-colors"
            >
              Discard
            </button>
          </div>
        </>
      )}

      {!loading && !error && enhanced && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wide">Original</p>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-sm text-text-soft whitespace-pre-wrap">{description}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-accent-purple uppercase tracking-wide">Enhanced</p>
              <p className="text-sm font-semibold text-white">{enhanced.title}</p>
              <p className="text-sm text-text-soft whitespace-pre-wrap">{enhanced.description}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onAccept({ title: enhanced.title, description: enhanced.description })}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">check</span>
              Apply
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-text-soft hover:text-white transition-colors"
            >
              Discard
            </button>
          </div>
        </>
      )}
    </div>
  );
}
