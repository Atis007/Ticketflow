export const eventsKeys = {
  all: ["events"],
  list: (categorySlug) => ["events", "list", categorySlug],
  detail: (categorySlug, eventSlug) => ["events", "detail", categorySlug, eventSlug],
};
