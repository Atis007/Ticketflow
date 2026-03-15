export const adminQueryKeys = {
  dashboard: {
    all: ["admin", "dashboard"],
    summary: () => ["admin", "dashboard", "summary"],
    sync: (since = "") => ["admin", "dashboard", "sync", since],
  },
  users: {
    all: ["admin", "users"],
    list: (params = {}) => ["admin", "users", "list", params],
    detail: (id) => ["admin", "users", "detail", id],
  },
  events: {
    all: ["admin", "events"],
    list: (params = {}) => ["admin", "events", "list", params],
    layout: (eventId) => ["admin", "events", "layout", eventId],
  },
  categories: {
    all: ["admin", "categories"],
    list: () => ["admin", "categories", "list"],
  },
  logs: {
    device: (params = {}) => ["admin", "logs", "device", params],
    admin: (params = {}) => ["admin", "logs", "admin", params],
    eventChanges: (params = {}) => ["admin", "logs", "eventChanges", params],
  },
  security: {
    incidents: (params = {}) => ["admin", "security", "incidents", params],
    blocks: (params = {}) => ["admin", "security", "blocks", params],
  },
  analytics: {
    sales: (days) => ["admin", "analytics", "sales", days],
  },
};
