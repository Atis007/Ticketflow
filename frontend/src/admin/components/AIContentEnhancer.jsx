import { useEffect, useState } from "react";

import { enhanceContent } from "../api/ai.api";
import { AdminButton } from "./AdminButton";

export default function AIContentEnhancer({ title, description, token, onAccept, onClose }) {
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
    <div className="mt-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg-subtle)] p-4 space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-base text-[var(--admin-text-muted)]">auto_awesome</span>
        <span className="text-[var(--admin-text-small)] font-medium text-[var(--admin-text-primary)]">AI Content Enhancer</span>
      </div>

      {loading && (
        <p className="text-[var(--admin-text-small)] text-[var(--admin-text-muted)]">Enhancing with AI...</p>
      )}

      {error && (
        <>
          <div className="rounded-lg border border-[var(--admin-status-error-border)] bg-[var(--admin-status-error-bg)] px-4 py-3 text-[var(--admin-text-small)] text-[var(--admin-status-error)]">
            {error}
          </div>
          <AdminButton variant="ghost" size="sm" onClick={onClose}>
            Discard
          </AdminButton>
        </>
      )}

      {!loading && !error && enhanced && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-[var(--admin-text-caption)] font-medium text-[var(--admin-text-muted)] uppercase tracking-wide">Original</p>
              <p className="text-[var(--admin-text-small)] font-semibold text-[var(--admin-text-primary)]">{title}</p>
              <p className="text-[var(--admin-text-small)] text-[var(--admin-text-secondary)] whitespace-pre-wrap">{description}</p>
            </div>
            <div className="space-y-2">
              <p className="text-[var(--admin-text-caption)] font-medium text-[var(--admin-text-muted)] uppercase tracking-wide">Enhanced</p>
              <p className="text-[var(--admin-text-small)] font-semibold text-[var(--admin-text-primary)]">{enhanced.title}</p>
              <p className="text-[var(--admin-text-small)] text-[var(--admin-text-secondary)] whitespace-pre-wrap">{enhanced.description}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <AdminButton
              variant="primary"
              size="sm"
              onClick={() => onAccept({ title: enhanced.title, description: enhanced.description })}
            >
              Apply
            </AdminButton>
            <AdminButton variant="ghost" size="sm" onClick={onClose}>
              Discard
            </AdminButton>
          </div>
        </>
      )}
    </div>
  );
}
