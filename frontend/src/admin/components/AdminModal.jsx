import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";

import { AdminButton } from "./AdminButton";

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

const MotionDiv = motion.div;

export function AdminModal({ isOpen, onClose, title, children, footer, size = "md" }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "unset";

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[var(--admin-z-modal-backdrop)] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <div className="pointer-events-none fixed inset-0 z-[var(--admin-z-modal)] flex items-center justify-center p-4">
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className={`pointer-events-auto flex max-h-[90vh] w-full flex-col rounded-[var(--admin-radius-xl)] border border-[var(--admin-border)] bg-[var(--admin-bg-elevated)] shadow-[var(--admin-shadow-xl)] ${sizeClasses[size]}`}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-6 py-5">
                <h2 className="font-[var(--admin-font-display)] text-[var(--admin-text-title)] font-bold text-[var(--admin-text-primary)]">{title}</h2>
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-bg-card)] hover:text-[var(--admin-text-primary)]"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              <div className="admin-scrollbar flex-1 overflow-y-auto px-6 py-5">{children}</div>

              {footer ? <div className="flex items-center justify-end gap-3 border-t border-[var(--admin-border)] px-6 py-4">{footer}</div> : null}
            </MotionDiv>
          </div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  loading = false,
}) {
  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <AdminButton variant="ghost" onClick={onClose} disabled={loading}>
            {cancelText}
          </AdminButton>
          <AdminButton variant={variant} onClick={onConfirm} loading={loading}>
            {confirmText}
          </AdminButton>
        </>
      }
    >
      <p className="text-[var(--admin-text-body)] text-[var(--admin-text-secondary)]">{message}</p>
    </AdminModal>
  );
}
