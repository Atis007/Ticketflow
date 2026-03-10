import { useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import SidebarMenu from "@/components/SidebarMenu";
import AsyncState from "@/components/AsyncState";
import EventLineupGrid from "@/events/EventLineupGrid";
import EventTicketCard from "@/events/EventTicketCard";
import EventOrganizerCard from "@/events/EventOrganizerCard";
import EventRelatedGrid from "@/events/EventRelatedGrid";
import { useEventDetails } from "@/events/hooks/useEventDetails";
import { useAuth } from "@/auth/context/AuthContext";
import { getCategories, updateEvent } from "@/events/events.api";

const FAVORITES_KEY = "ticketflow_favorites";

function readFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeFavorites(ids) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

function DetailCard({ icon, label, value, subValue }) {
  return (
    <div className="bg-surface-dark border border-border rounded-xl p-4 flex items-start gap-3">
      <div className="p-2 rounded-lg bg-surface-mid border border-border text-accent-cyan">{icon}</div>
      <div>
        <span className="text-xs text-text-muted block">{label}</span>
        <span className="text-white">{value}</span>
        {subValue ? <span className="text-xs text-text-muted block mt-0.5">{subValue}</span> : null}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-text-soft">{label}</label>
      {children}
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

function EditModal({ event, token, onClose, onSaved }) {
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000,
  });

  const categories = categoriesQuery.data?.categories || categoriesQuery.data || [];

  const [form, setForm] = useState({
    title: event.title || "",
    city: event.location?.split(", ")?.[0] || "",
    venue: event.venue || "",
    isFree: event.purchase?.isFree ?? false,
    price: event.purchase?.price ? String(event.purchase.price) : "",
    description: (event.description || []).join("\n\n"),
    categoryId: "",
    subcategoryId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const selectedCategory = categories.find((c) => String(c.id) === String(form.categoryId));
  const subcategories = selectedCategory?.subcategories || [];

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("title", form.title.trim());
      if (form.city.trim()) formData.append("city", form.city.trim());
      if (form.venue.trim()) formData.append("venue", form.venue.trim());
      formData.append("is_free", form.isFree ? "1" : "0");
      if (!form.isFree && form.price) formData.append("price", form.price);
      if (form.description.trim()) formData.append("description", form.description.trim());
      if (form.categoryId) formData.append("category_id", form.categoryId);
      if (form.subcategoryId) formData.append("subcategory_id", form.subcategoryId);

      await updateEvent(token, event.id, formData);
      onSaved();
    } catch (err) {
      setError(err.message || "Failed to save changes.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background-dark/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full mx-4 max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-surface-dark shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="font-display text-xl text-white">Edit Event</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 hover:border-white/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-text-muted">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Title *">
            <Input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </Field>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Category">
              <Select
                value={form.categoryId}
                onChange={(e) => { set("categoryId", e.target.value); set("subcategoryId", ""); }}
              >
                <option value="">Keep current</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Subcategory">
              <Select
                value={form.subcategoryId}
                onChange={(e) => set("subcategoryId", e.target.value)}
                disabled={!form.categoryId || subcategories.length === 0}
              >
                <option value="">Keep current</option>
                {subcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>{sub.name}</option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="City">
              <Input type="text" value={form.city} onChange={(e) => set("city", e.target.value)} />
            </Field>
            <Field label="Venue">
              <Input type="text" value={form.venue} onChange={(e) => set("venue", e.target.value)} />
            </Field>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={form.isFree}
              onClick={() => set("isFree", !form.isFree)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isFree ? "bg-primary" : "bg-surface-mid border border-white/10"}`}
            >
              <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.isFree ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <span className="text-sm text-text-soft">Free event</span>
          </div>

          {!form.isFree ? (
            <Field label="Price (RSD)">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
              />
            </Field>
          ) : null}

          <Field label="Description">
            <Textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} />
          </Field>

          {error ? (
            <div className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 items-center rounded-full border border-white/20 px-5 text-sm font-semibold text-text-soft hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EventDetailsPage() {
  const { categorySlug, eventSlug } = useParams();
  const { user, token, isAuthenticated } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef(null);

  const detailsQuery = useEventDetails(categorySlug, eventSlug);
  const event = detailsQuery.event;

  const [favoriteVersion, setFavoriteVersion] = useState(0);
  const isFavorited = useMemo(() => {
    if (!event?.id) return false;
    return readFavorites().includes(String(event.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, favoriteVersion]);

  const tags = useMemo(() => {
    if (!event?.categoryBadges) return [];
    return event.categoryBadges.map((badge) => badge.label);
  }, [event]);

  const isOwner = isAuthenticated && event?.createdBy && user?.id === event.createdBy;

  function toggleFavorite() {
    if (!event?.id) return;
    const id = String(event.id);
    const current = readFavorites();
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    writeFavorites(next);
    setFavoriteVersion((v) => v + 1);
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: event?.title || "Event", url });
      } catch {
        // user cancelled or not supported
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        clearTimeout(copiedTimerRef.current);
        copiedTimerRef.current = setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard not available
      }
    }
  }

  if (detailsQuery.isPending && !event) {
    return (
      <div className="mx-auto mt-20 w-full max-w-5xl">
        <AsyncState message="Loading event details..." />
      </div>
    );
  }

  if (detailsQuery.isError) {
    return (
      <div className="mx-auto mt-20 w-full max-w-5xl">
        <AsyncState
          type="error"
          message={detailsQuery.error?.message || "Failed to load event details."}
          onRetry={() => detailsQuery.refetch()}
        />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="mx-auto mt-20 w-full max-w-5xl">
        <AsyncState message="Event not found." />
      </div>
    );
  }

  return (
    <>
      <SidebarMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      {editOpen ? (
        <EditModal
          event={event}
          token={token}
          onClose={() => setEditOpen(false)}
          onSaved={() => { setEditOpen(false); detailsQuery.refetch(); }}
        />
      ) : null}
      <main className="relative min-h-screen pt-6 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[520px] w-full max-w-6xl opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary via-transparent to-transparent blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="flex items-center justify-between">
            <Link
              to="/events"
              className="inline-flex items-center gap-2 text-text-muted hover:text-accent-cyan transition-colors mb-6"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Events</span>
            </Link>
            <div className="flex items-center gap-2 mb-6">
              {isOwner ? (
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Edit
                </button>
              ) : null}
              <button
                className="inline-flex lg:hidden items-center gap-2 rounded-full border border-border bg-surface-dark px-4 py-2 text-sm font-semibold text-white transition-colors hover:border-primary/50 hover:text-primary"
                onClick={() => setMenuOpen(true)}
              >
                <span className="material-symbols-outlined text-[18px]">menu_open</span>
                Categories
              </button>
            </div>
          </div>

          <div className="relative h-64 md:h-[420px] rounded-2xl overflow-hidden mb-8 border border-border">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/25 via-surface-ink to-accent-cyan/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/40 to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(var(--color-accent-cyan-rgb),0.2),_transparent_55%)]" />

            <div className="absolute top-4 right-4 flex gap-2">
              <button
                type="button"
                onClick={toggleFavorite}
                className="p-3 rounded-full bg-background-dark/60 backdrop-blur-sm border border-white/10 hover:border-primary/50 transition-all"
                aria-label={isFavorited ? "Remove from favorites" : "Save event"}
              >
                <span className={`material-symbols-outlined ${isFavorited ? "text-primary" : "text-white/70"}`}>
                  {isFavorited ? "star" : "star_border"}
                </span>
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={handleShare}
                  className="p-3 rounded-full bg-background-dark/60 backdrop-blur-sm border border-white/10 hover:border-accent-cyan/50 transition-all"
                  aria-label="Share event"
                >
                  <span className="material-symbols-outlined text-white/70">share</span>
                </button>
                {copied ? (
                  <div className="absolute top-full right-0 mt-2 whitespace-nowrap rounded-lg border border-white/10 bg-surface-dark px-3 py-1.5 text-xs text-white shadow-lg">
                    Link copied!
                  </div>
                ) : null}
              </div>
            </div>

            <div className="absolute bottom-6 left-6 right-6">
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/70 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm mb-3">
                {event.categoryBadges?.[0]?.label || "Event"}
              </span>
              <h1 className="text-2xl md:text-4xl font-display tracking-tight text-white drop-shadow-lg">
                {event.title}
              </h1>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <div className="bg-surface-dark border border-border rounded-xl p-6">
                <h2 className="text-xl mb-4 text-white font-display">About This Event</h2>
                <div className="text-text-muted leading-relaxed space-y-4">
                  {event.description.map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <DetailCard
                  icon={<span className="material-symbols-outlined text-[18px]">calendar_month</span>}
                  label="Date & Time"
                  value={event.dateTime}
                />
                <DetailCard
                  icon={<span className="material-symbols-outlined text-[18px]">location_on</span>}
                  label="Venue"
                  value={event.venue}
                  subValue={event.location}
                />
                <DetailCard
                  icon={<span className="material-symbols-outlined text-[18px]">category</span>}
                  label="Category"
                  value={event.categoryBadges?.[0]?.label || "Event"}
                />
                <DetailCard
                  icon={<span className="material-symbols-outlined text-[18px]">sell</span>}
                  label="Type"
                  value={event.categoryBadges?.[1]?.label || "General"}
                />
              </div>

              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm bg-surface-mid border border-border text-text-muted hover:text-white hover:border-primary/40 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">sell</span>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="space-y-4">
                <h2 className="text-xl text-white font-display">Lineup</h2>
                <EventLineupGrid lineup={event.lineup} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="sticky top-24 flex flex-col gap-4">
                <EventTicketCard tickets={event.tickets} purchase={event.purchase} />
                <EventOrganizerCard />
              </div>
            </div>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-surface-dark to-transparent my-16" />

          <EventRelatedGrid events={event.similar} />
        </div>
      </main>
    </>
  );
}
