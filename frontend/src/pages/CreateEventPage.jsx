import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/auth/context/AuthContext";
import { getCategories, createEvent } from "@/events/events.api";
import ContentEnhancer from "@/components/ContentEnhancer";
import VenueLayoutGenerator from "@/components/VenueLayoutGenerator";

function Field({ label, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-text-soft">{label}</label>
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}

function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-white/10 bg-surface-mid px-3 py-2.5 text-sm text-white placeholder-text-muted focus:border-primary/50 focus:outline-none transition-colors ${className}`}
      {...props}
    />
  );
}

function Textarea({ className = "", ...props }) {
  return (
    <textarea
      className={`w-full rounded-lg border border-white/10 bg-surface-mid px-3 py-2.5 text-sm text-white placeholder-text-muted focus:border-primary/50 focus:outline-none transition-colors resize-none ${className}`}
      {...props}
    />
  );
}

function Select({ className = "", children, ...props }) {
  return (
    <select
      className={`w-full rounded-lg border border-white/10 bg-surface-mid px-3 py-2.5 text-sm text-white focus:border-primary/50 focus:outline-none transition-colors ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

const EMPTY_FORM = {
  title: "",
  slug: "",
  categoryId: "",
  subcategoryId: "",
  city: "",
  venue: "",
  startsAt: "",
  endsAt: "",
  isFree: false,
  price: "",
  capacity: "",
  description: "",
  image: null,
  isSeated: false,
  layout: null,
};

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = "Title is required.";
  if (form.slug && !/^[a-z0-9-]+$/.test(form.slug)) {
    errors.slug = "Slug must contain only lowercase letters, numbers, and hyphens.";
  }
  if (!form.categoryId) errors.categoryId = "Category is required.";
  if (!form.subcategoryId) errors.subcategoryId = "Subcategory is required.";
  if (!form.startsAt) errors.startsAt = "Start date is required.";
  if (!form.isFree && (!form.price || Number(form.price) <= 0)) {
    errors.price = "Price must be greater than 0 for paid events.";
  }
  return errors;
}

function getLayoutTotalSeats(layout) {
  if (!layout?.sections) return 0;
  return layout.sections.reduce(
    (sum, section) => sum + section.rows.reduce((rowSum, row) => rowSum + (row.seatCount || row.seat_count || 0), 0),
    0,
  );
}

export default function CreateEventPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showEnhancer, setShowEnhancer] = useState(false);
  const [showLayoutGenerator, setShowLayoutGenerator] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesQuery.data?.categories || categoriesQuery.data || [];

  const selectedCategory = categories.find((c) => String(c.id) === String(form.categoryId));
  const subcategories = selectedCategory?.subcategories || [];

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleImageFile(file) {
    if (!file || !file.type.startsWith("image/")) return;
    set("image", file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleImageChange(e) {
    handleImageFile(e.target.files?.[0]);
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleImageFile(e.dataTransfer.files?.[0]);
  }

  const layoutTotalSeats = getLayoutTotalSeats(form.layout);
  const capacityMismatch = form.layout && form.capacity && Number(form.capacity) !== layoutTotalSeats;

  async function handleSubmit(e) {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      if (form.slug.trim()) formData.append("slug", form.slug.trim());
      formData.append("categoryId", form.categoryId);
      formData.append("subcategoryId", form.subcategoryId);
      if (form.city.trim()) formData.append("city", form.city.trim());
      if (form.venue.trim()) formData.append("venue", form.venue.trim());
      formData.append("startsAt", form.startsAt);
      if (form.endsAt) formData.append("endsAt", form.endsAt);
      formData.append("isFree", form.isFree ? "1" : "0");
      if (!form.isFree && form.price) formData.append("price", form.price);
      if (form.capacity) formData.append("capacity", form.capacity);
      if (form.description.trim()) formData.append("description", form.description.trim());
      if (form.image) formData.append("image", form.image);
      formData.append("isSeated", form.isSeated ? "1" : "0");
      if (form.isSeated && form.layout) {
        formData.append("layout", JSON.stringify(form.layout));
      }

      const data = await createEvent(token, formData);
      const event = data?.event || data;

      if (event?.category_slug && event?.slug) {
        navigate(`/events/${event.category_slug}/${event.slug}`);
      } else {
        navigate("/profile");
      }
    } catch (err) {
      setSubmitError(err.message || "Failed to create event.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen pt-6 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[520px] w-full max-w-6xl opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <Link
          to="/profile"
          className="inline-flex items-center gap-2 text-text-muted hover:text-accent-cyan transition-colors mb-6"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Profile</span>
        </Link>

        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-white">Create Event</h1>
          <p className="mt-1 text-text-muted">Fill in the details below to publish your event.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info — merged with Details */}
          <div className="rounded-2xl border border-white/10 bg-surface-dark/70 p-6 space-y-5">
            <h2 className="font-display text-lg text-white">Basic Info</h2>

            <Field label="Event Title *" error={errors.title}>
              <Input
                type="text"
                placeholder="My Awesome Event"
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
              />
            </Field>

            <Field label="Slug (optional)" error={errors.slug}>
              <Input
                type="text"
                placeholder="my-awesome-event (auto-generated if empty)"
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Category *" error={errors.categoryId}>
                <Select
                  value={form.categoryId}
                  onChange={(e) => {
                    set("categoryId", e.target.value);
                    set("subcategoryId", "");
                  }}
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Subcategory *" error={errors.subcategoryId}>
                <Select
                  value={form.subcategoryId}
                  onChange={(e) => set("subcategoryId", e.target.value)}
                  disabled={!form.categoryId || subcategories.length === 0}
                >
                  <option value="">Select subcategory</option>
                  {subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="City" error={errors.city}>
                <Input
                  type="text"
                  placeholder="Belgrade"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                />
              </Field>
              <Field label="Venue" error={errors.venue}>
                <Input
                  type="text"
                  placeholder="Arena"
                  value={form.venue}
                  onChange={(e) => set("venue", e.target.value)}
                />
              </Field>
            </div>

            <Field label="Description" error={errors.description}>
              <Textarea
                rows={5}
                placeholder="Tell attendees what to expect..."
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>

            {!showEnhancer && (form.title.trim() || form.description.trim()) && (
              <button
                type="button"
                onClick={() => setShowEnhancer(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-accent-purple/30 bg-accent-purple/10 px-3 py-2 text-sm font-medium text-accent-purple transition-colors hover:bg-accent-purple/20"
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                Enhance Title & Description
              </button>
            )}

            {showEnhancer && (
              <ContentEnhancer
                title={form.title}
                description={form.description}
                token={token}
                onAccept={({ title, description }) => {
                  if (title) set("title", title);
                  if (description) set("description", description);
                  setShowEnhancer(false);
                }}
                onClose={() => setShowEnhancer(false)}
              />
            )}

            <Field label="Event Image" error={errors.image}>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => { set("image", null); setImagePreview(null); }}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background-dark/80 border border-white/10 hover:border-danger/50 hover:text-danger transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ) : (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center h-32 rounded-lg border border-dashed bg-surface-mid cursor-pointer transition-colors ${dragOver ? "border-primary bg-primary/10" : "border-white/20 hover:border-primary/40"}`}
                >
                  <span className="material-symbols-outlined text-3xl text-text-muted mb-1">image</span>
                  <span className="text-sm text-text-muted">Click or drag & drop to upload</span>
                  <input ref={fileInputRef} type="file" accept="image/*" className="sr-only" onChange={handleImageChange} />
                </div>
              )}
            </Field>
          </div>

          {/* Date & Time */}
          <div className="rounded-2xl border border-white/10 bg-surface-dark/70 p-6 space-y-5">
            <h2 className="font-display text-lg text-white">Date & Time</h2>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Starts At *" error={errors.startsAt}>
                <Input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => set("startsAt", e.target.value)}
                />
              </Field>
              <Field label="Ends At" error={errors.endsAt}>
                <Input
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => set("endsAt", e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Tickets & Capacity */}
          <div className="rounded-2xl border border-white/10 bg-surface-dark/70 p-6 space-y-5">
            <h2 className="font-display text-lg text-white">Tickets & Capacity</h2>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.isFree}
                onClick={() => {
                  const next = !form.isFree;
                  set("isFree", next);
                  if (next && form.isSeated) {
                    set("isSeated", false);
                    set("layout", null);
                    setShowLayoutGenerator(false);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isFree ? "bg-primary" : "bg-surface-mid border border-white/10"}`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.isFree ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
              <span className="text-sm text-text-soft">Free event</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.isSeated}
                onClick={() => {
                  const next = !form.isSeated;
                  set("isSeated", next);
                  if (next && form.isFree) {
                    set("isFree", false);
                  }
                  if (!next) {
                    set("layout", null);
                    setShowLayoutGenerator(false);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isSeated ? "bg-primary" : "bg-surface-mid border border-white/10"}`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.isSeated ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
              <span className="text-sm text-text-soft">Seated event</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Price (RSD)" error={errors.price}>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.price}
                  disabled={form.isFree}
                  onChange={(e) => set("price", e.target.value)}
                  className={form.isFree ? "opacity-40 cursor-not-allowed" : ""}
                />
              </Field>
              <Field label="Capacity" error={errors.capacity}>
                <Input
                  type="number"
                  min="1"
                  placeholder="500"
                  value={form.capacity}
                  onChange={(e) => set("capacity", e.target.value)}
                />
              </Field>
            </div>

            {/* Seated event: layout generation */}
            {form.isSeated && !form.layout && !showLayoutGenerator && form.capacity && Number(form.capacity) > 0 && (
              <button
                type="button"
                onClick={() => setShowLayoutGenerator(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <span className="material-symbols-outlined text-base">stadium</span>
                Generate Layout
              </button>
            )}

            {showLayoutGenerator && !form.layout && (
              <VenueLayoutGenerator
                venueName={form.venue}
                capacity={form.capacity}
                token={token}
                onAccept={(layout) => {
                  set("layout", layout);
                  setShowLayoutGenerator(false);
                }}
                onClose={() => setShowLayoutGenerator(false)}
              />
            )}

            {/* Layout summary */}
            {form.layout && (
              <div className="rounded-lg border border-accent-green/30 bg-accent-green/10 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-accent-green">Layout applied</span>
                  <button
                    type="button"
                    onClick={() => set("layout", null)}
                    className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-danger transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                    Clear Layout
                  </button>
                </div>

                <div className="space-y-1">
                  {form.layout.sections.map((section, i) => {
                    const sectionSeats = section.rows.reduce((s, r) => s + (r.seatCount || r.seat_count || 0), 0);
                    return (
                      <div key={i} className="flex items-center justify-between text-sm px-2 py-1 rounded border border-white/5">
                        <span className="text-white">{section.name}</span>
                        <span className="text-text-muted">{sectionSeats} seats</span>
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-text-muted">
                  Total: <span className="font-semibold text-white">{layoutTotalSeats}</span> seats
                </p>

                {capacityMismatch && (
                  <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
                    Layout has {layoutTotalSeats} seats but capacity is set to {form.capacity}.
                  </div>
                )}
              </div>
            )}
          </div>

          {submitError ? (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {submitError}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3">
            <Link
              to="/profile"
              className="inline-flex h-11 items-center rounded-full border border-white/20 px-6 text-sm font-semibold text-text-soft hover:border-white/40 hover:text-white transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>
                  Creating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Create Event
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
