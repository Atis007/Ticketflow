export const API_CONFIG = {
  BASE_URL: "http://localhost/backend/api",

  // AUTHENTICATION ENDPOINTS

  ADMIN_AUTH: {
    // They are here, but might be unused because disabled in backend
    LOGIN: "/auth/admin/login",
    REGISTER: "/auth/admin/register",
  },

  USER_AUTH: {
    LOGIN: "/auth/user/login",
    REGISTER: "/auth/user/register",
  },

  // ADMIN USER CRUD

  ADMIN_USERS: {
    BASE: "/admin/users",
    BY_ID: (userId) => `/admin/users/${userId}`,
  },

  // RESOURCE CONTROLLERS

  EVENTS: {
    BASE: "/events",
    BY_ID: (eventId) => `/events/${eventId}`,
  },

  CATEGORIES: {
    BASE: "/categories",
    BY_ID: (categoryId) => `/categories/${categoryId}`,
  },

  TICKETS: {
    BASE: "/tickets",
    BY_ID: (ticketId) => `/tickets/${ticketId}`,
  },

  PAYMENTS: {
    BASE: "/payments",
    BY_ID: (paymentId) => `/payments/${paymentId}`,
  },

  RESERVATIONS: {
    BASE: "/reservations",
    BY_ID: (reservationId) => `/reservations/${reservationId}`,
  },

  SEATS: {
    BASE: "/seats",
    BY_ID: (seatId) => `/seats/${seatId}`,
  },
};
