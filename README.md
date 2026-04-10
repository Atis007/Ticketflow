# Ticketflow

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

A full-stack event ticketing platform built across three layers — a PHP 8.4 REST API, a React web frontend, and a React Native mobile app — with a separate FastAPI AI microservice running local LLM inference via Ollama.

Most university ticketing projects stop at CRUD and a login form. Ticketflow goes further: NBS IPS QR code payment integration, real-time seat availability, offline-first mobile check-in with sync-on-reconnect, role-based access across all three platforms, and an AI service that can generate venue seating layouts, enhance event descriptions, and serve as an admin chat assistant with tool-calling capabilities. The whole thing is backed by a PostgreSQL schema with 15 tables, 19 API controllers, and 22 business logic services.
Built for two university courses (Integrated Web Systems and Advanced Web Programming).

## Overview

Ticketflow is a comprehensive full-stack event ticketing platform featuring a PHP REST API backend, React web frontend, and React Native mobile application. The system supports event discovery, ticket purchasing, QR-code generation for entry verification, AI-powered administrative tools, and role-based access control across all platforms.

## Core Features

- User authentication, email verification, and role-based access control (Guest, User, Organizer, Admin)
- Complete event management with category organization and dynamic seat management
- NBS IPS-formatted QR code generation for ticket verification and check-in
- Secure payment processing with IPS payment gateway integration
- Real-time seat availability tracking with polling mechanism
- Admin dashboard with comprehensive user, event, and category management tools
- Device and IP-based security tracking with incident logging
- Push notifications for event updates and ticket confirmations
- Mobile-first check-in system with offline sync capability
- AI-powered venue layout generation with JSON schema validation
- AI-assisted event description enhancement for marketing content
- Admin chat assistant with multi-turn conversation and tool execution
- Full audit trail for administrative actions and security events
- Advanced analytics for sales and event performance tracking

## Technology Stack

### Backend

- Language: PHP 8.4
- Database: PostgreSQL with timezone support
- Architecture: Custom REST API (no framework dependencies)
- Authentication: Bearer token-based with 24-hour default expiry
- Email: PHPMailer for SMTP-based notifications
- Payment: NBS IPS integration for Serbian payment processing

### Frontend Web

- Framework: React 19 with Vite build system
- Routing: React Navigation v7 with file-based route guards
- State Management: TanStack React Query v5 for server state
- Authentication: Custom AuthContext with session persistence
- Styling: Tailwind CSS v4 with Motion animations
- Admin Features: DataTables integration with real-time data

### Mobile Application

- Framework: React Native 0.81 with Expo runtime
- Navigation: React Navigation v7 with native stack and bottom tab navigators
- State Management: React Query for server state, AsyncStorage for persistence
- Styling: NativeWind (Tailwind CSS for React Native)
- Features: Camera integration for QR scanning, push notifications via Expo, haptics for feedback, SQLite for offline data, brightness control for scanning

### AI Service

- Framework: FastAPI with Uvicorn server
- LLM Engine: Ollama for local model inference
- API Integration: HTTP clients for backend communication
- Validation: Pydantic for schema enforcement

## Architecture Overview

### Backend Structure

**Controllers (19 total)**

- Event Management: EventController with CRUD and category-based filtering
- Category Management: CategoryController with nested subcategory support
- User System: UserController covering authentication, registration, password reset
- Seat Management: EventSeatController for reservations and availability
- Ticketing: TicketController for active/archived tickets and QR code scanning
- Payments: PaymentController integrating with IPS gateway
- Purchases: PurchaseController with QR generation
- Admin Tools: AdminEventController, AdminCategoryController, AdminAnalyticsController, AdminLogController, AdminSecurityController
- Notifications: NotificationController for real-time updates
- Mobile Support: MobileController for push tokens and offline operations

**Services (22 total)**

- AuthSessionService and AuthorizationService for access control
- MailService and VerificationService for email workflows
- EventSeatService and EventSectionService for venue management
- IpsQrService for NBS IPS QR code generation
- ImageUploadService for event media
- DeviceDetectionService and DeviceLogService for security tracking
- AdminAuditService for comprehensive action logging
- AiServiceClient for backend-to-AI-service communication
- Various HTTP utilities for trusted proxy handling

**Middleware**

- AuthMiddleware providing token validation and role-based access control

### Frontend Structure

**Pages (8 primary + 10 admin)**

- LandingPage: Application entry point
- EventsPage: Browse events with category filtering
- EventDetailsPage: Event information and ticket purchase flow
- CreateEventPage: Event creation for organizers
- ProfilePage: User dashboard and settings
- MyTicketsPage: Active tickets with QR codes
- ArchivePage: Historical tickets and event history
- Admin Dashboard: Overview and system health status
- Admin User Management: DataTables with user controls
- Admin Event Management: Event creation and modification
- Admin Category Management: Venue categorization
- Admin Analytics: Sales and performance metrics
- Admin Logs: Device access, admin actions, event changes
- Admin Security: Incident tracking and IP blocking

**Authentication**

- Route guards enforce guest-only, authenticated, email-verified, and admin-only access
- Token-based authentication with auto-logout on 401

### Mobile Structure

**Screens (12 primary + check-in specialized)**

- Home: User profile hub
- EventListScreen: Browse and search events
- EventDetailScreen: Event information and booking
- SeatSelectionScreen: Interactive venue map
- ReservationScreen: Review before purchase
- PaymentScreen: Payment processing
- MyTicketsScreen: Active ticket display with QR codes
- ArchiveScreen: Historical tickets
- FavoritesScreen: Saved events
- EntryModeScreen: Toggle between regular browsing and check-in
- CheckIn Screens: QR scanning, offline database sync

**Capabilities**

- Native camera integration for QR code scanning
- Offline check-in data storage with sync on reconnection
- Push notification handling with deep linking
- Device persistence using AsyncStorage
- Real-time seat availability updates via polling

### AI Service Architecture

**Endpoints (3 primary)**

1. POST `/api/layout/generate`
   - Generates valid JSON seating layouts for venues
   - Accepts venue name, type, target capacity, and additional instructions
   - Uses Ollama for structured JSON generation with retry logic
   - Normalizes and validates output before returning

2. POST `/api/chat`
   - Multi-turn conversation interface for administrators
   - Supports function calling with tool execution
   - Available tools: createEvent, generateDescription, analyzeSales, updateTickets, sendMarketingEmail
   - Executes up to 5 tool-calling cycles per request

3. POST `/enhance-content`
   - Improves event titles and descriptions
   - Preserves original language
   - Optimizes for marketing impact

## Database Design

PostgreSQL database with the following key tables:

- `users`: User accounts with role assignments
- `auth_sessions`: Bearer token sessions with user agent and IP tracking
- `events`: Event data with pricing and capacity
- `categories`, `subcategories`: Event organization hierarchy
- `event_seats`: Individual seat entries with tier and pricing
- `event_sections`: Venue sections (VIP, regular, etc.)
- `tickets`: User purchases with associated QR codes
- `payments`: Payment records with IPS gateway data
- `notifications`: Delivery queue for user notifications
- `device_logs`: Access tracking by device and IP
- `admin_logs`: Comprehensive audit trail for administrative actions
- `event_change_logs`: Historical modifications to events
- `security_incidents`: Suspicious activity flagging
- `admin_ip_blocks`: IP address blocking

## API Response Format

All endpoints return standardized JSON responses:

```json
{
  "success": boolean,
  "data": {},
  "error": "string (if applicable)",
  "message": "string (optional)"
}
```

## Security Features

- Email verification requirement before ticket purchases
- Bearer token authentication with configurable expiry
- Device and IP address logging for all user sessions
- IP blocking capability for security incidents
- Comprehensive admin audit trail for all administrative operations
- Role-based access control at middleware level
- Prepared statements preventing SQL injection
- Trusted proxy handling for accurate client IP resolution
- Rate limiting support with 429 HTTP status handling
- PII protection through secure password hashing

## Testing and Evaluation

The project includes evaluation infrastructure in the `ai-evals/` directory:

- Test case definitions for chat tool functionality
- Layout generation validation scenarios
- Automated evaluation runner for AI service functionality

## Getting Started

### Prerequisites

- PHP 8.4
- PostgreSQL database
- Node.js 18+ (for frontend and mobile)
- Python 3.9+ (for AI service)
- Ollama (for local model inference)

### Installation

Backend:

```bash
cd backend
composer install
cp config/config.php.example config/config.php
# Configure database and mail settings
php bootstrap.php
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Mobile:

```bash
cd mobile
npm install
npx expo start
```

AI Service:

```bash
cd ai-service
pip install -r requirements.txt
python main.py
```

## Project Structure

```
ticketflow/
├── backend/              # PHP REST API
│   ├── src/
│   │   ├── Controllers/  # 19 API controllers
│   │   ├── Services/     # 22 business logic services
│   │   ├── Models/       # Data models
│   │   ├── Middleware/   # Auth and validation
│   │   └── Validation/   # Input validation
│   ├── config/
│   └── public/
├── frontend/             # React web application
│   ├── src/
│   │   ├── pages/        # 18 route pages
│   │   ├── admin/        # Admin dashboard
│   │   ├── components/   # Reusable components
│   │   ├── routes/       # Route definition and guards
│   │   ├── query/        # React Query client setup
│   │   └── utils/        # Helper functions
├── mobile/               # React Native application
│   ├── pages/            # 12+ screen components
│   ├── api/              # API layer and query keys
│   ├── hooks/            # Custom hooks
│   ├── auth/             # Auth context and flows
│   ├── components/       # Screen components
│   └── guards/           # Route protection
├── ai-service/           # Python FastAPI service
│   ├── routes/           # 3 main endpoints
│   ├── schemas/          # Pydantic models
│   ├── services/         # Business logic
│   └── tools/            # Tool definitions
└── ai-evals/             # Testing infrastructure
    ├── runners/
    └── test_cases/
```

## License

MIT License - See LICENSE file for details
