import { useRef, useState } from "react";

import { useAuth } from "../../auth/context/AuthContext";
import { uploadAvatar } from "../profile.api";

function getDisplayName(user) {
  if (!user) {
    return "User";
  }

  return user.fullName || user.fullname || user.name || "User";
}

function getInitials(name) {
  const normalized = String(name || "").trim();
  if (!normalized) {
    return "U";
  }

  return normalized
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function ProfileHeader({ user, onLogout, loggingOut }) {
  const { token, updateUser } = useAuth();
  const [imageFailed, setImageFailed] = useState(false);
  const [preview, setPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const displayName = getDisplayName(user);
  const email = user?.email || "";
  const role = (user?.role || "user").toUpperCase();
  const avatarUrl = user?.avatarUrl || "";
  const displaySrc = preview || avatarUrl;
  const showImage = Boolean(displaySrc) && !imageFailed;

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) {
      setUploadError("Only JPEG, PNG, WebP, or GIF images are allowed.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError("Image must be smaller than 5 MB.");
      e.target.value = "";
      return;
    }

    setUploadError(null);
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
    setImageFailed(false);
    e.target.value = "";
  }

  async function handleUpload() {
    if (!pendingFile) return;
    setUploading(true);
    setUploadError(null);
    try {
      const data = await uploadAvatar(token, pendingFile);
      if (data?.avatarUrl) {
        updateUser({ avatarUrl: data.avatarUrl });
      }
      setPendingFile(null);
      setPreview(null);
    } catch (err) {
      setUploadError(err.message || "Avatar upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleCancel() {
    setPendingFile(null);
    setPreview(null);
    setUploadError(null);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-surface-dark/70 p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="relative h-18 w-18 overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-accent-purple/30 to-accent-cyan/30">
              {showImage ? (
                <img
                  src={displaySrc}
                  alt={displayName}
                  className="h-full w-full object-cover"
                  onError={(event) => {
                    event.currentTarget.style.display = "none";
                    setImageFailed(true);
                  }}
                />
              ) : null}
              {!showImage ? (
                <div className="absolute inset-0 flex items-center justify-center font-display text-lg font-bold text-white">
                  {getInitials(displayName)}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-surface-dark hover:bg-surface-mid transition-colors"
              aria-label="Change avatar"
            >
              <span className="material-symbols-outlined text-[14px] text-text-muted">photo_camera</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-white">{displayName}</h1>
              <span className="rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold tracking-wide text-primary">{role}</span>
            </div>
            <p className="mt-1 text-sm text-text-soft">{email}</p>
            {uploadError ? (
              <p className="mt-2 text-xs text-danger">{uploadError}</p>
            ) : null}
            {pendingFile ? (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/20 border border-primary/40 px-3 py-1 text-xs font-semibold text-primary hover:bg-primary/30 transition-colors disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Save photo"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={uploading}
                  className="text-xs text-text-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/20 px-4 text-sm font-semibold text-text-soft transition-colors hover:border-danger hover:text-danger disabled:opacity-50 disabled:pointer-events-none"
        >
          {loggingOut ? (
            <>
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              Logging out...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">logout</span>
              Logout
            </>
          )}
        </button>
      </div>
    </section>
  );
}
