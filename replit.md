# CarDrop - Parking Space Sharing Platform

## Overview
CarDrop is a web-based parking space sharing platform for the Serbian market, enabling users to rent out their private parking spots and find available parking. The platform features a modern design with dark mode (default) and light mode (WhatsApp cream theme), integrates with Monri Payments for secure transactions, and is designed for an intuitive cross-device experience. Key capabilities include listing management, search and discovery via an interactive map, a secure booking system, and a comprehensive review and rating system. The project aims to provide a reliable and user-friendly solution for urban parking challenges in Serbia.

## User Preferences
I prefer simple language and detailed explanations. I want iterative development and prefer that you ask before making major changes.

## System Architecture
### UI/UX Decisions
The platform features a dual-theme design with green accent colors:
- **Dark Mode (default)**: Dark background (#1e1e1e) with green accents (#40916C, #52B788)
- **Light Mode**: WhatsApp cream theme (#ECE5DD background) with green accents
- Primary color: Green (#40916C)
- Accent color: Bright green (#52B788)
- Typography: Inter typeface
- Mobile-first responsive design with 16px base spacing
- Theme toggle available in header for switching between light/dark modes
- Serbian/English language toggle on landing page and add-spot page

### Technical Implementations
*   **Frontend**: React with TypeScript, Tailwind CSS, Shadcn UI.
*   **Backend**: Express.js with TypeScript.
*   **Database**: PostgreSQL (Neon-backed).
*   **Authentication**: Custom email/password authentication with bcryptjs password hashing. Google OAuth support via google-auth-library. Session-based auth using express-session + connect-pg-simple. Auth page at `/auth` route with login/register toggle. All `req.session.userId` based (no more Replit Auth/OIDC). Google OAuth requires `VITE_GOOGLE_CLIENT_ID` env var to enable the Google Sign-In button.
*   **Object Storage**: Replit Object Storage for image uploads with ACL security.
*   **Mapping**: Interactive Leaflet map for spot discovery.
*   **Theme System**: next-themes integration with dark mode as default, light mode with WhatsApp cream color scheme.
*   **PWA (Progressive Web App)**: Full PWA support with manifest.json, Service Worker for offline caching, and "Add to Home Screen" functionality. Install button appears on landing page below main CTA buttons.
*   **Push Notifications**: Web Push notification support using VAPID keys. Backend (`server/push.ts`) handles subscription management and sending notifications. Frontend hook (`use-push-notifications.ts`) manages permission requests and subscriptions. Database table `pushSubscriptions` stores user subscriptions. Toggle in user dashboard profile tab allows enabling/disabling notifications.
*   **Messaging System**: Direct messaging between users. Renters can send messages to spot owners from the spot detail page. Database table `messages` stores all messages with sender, receiver, spot reference, content, and read status. Push notifications are automatically sent when a new message is received.
*   **Address Autocomplete**: Geoapify API integration (@geoapify/geocoder-autocomplete) with Serbia-only filter, 300ms debounce, and automatic coordinate population.
*   **Review System**: Allows renters to rate and comment on spots after paid bookings, with unique constraints to prevent duplicate reviews. Reviews are displayed on spot detail pages.
*   **Public Browsing with Auth-Protected Actions**: All pages are publicly accessible, but actions like booking or adding spots require authentication, triggering a `LoginRequiredDialog`.
*   **Terms & Conditions**: A dedicated page with a liability disclaimer, requiring acceptance before accessing authenticated features.

### Feature Specifications
*   **User Management**: Registration, authentication, and profile management. Users have `hasUsedFreeTrial` flag to track trial eligibility.
*   **Listing Management**: Owners can list parking spots with location, time slots, pricing (RSD/BAM), contact phone, payment type, spot type, and features. Includes secure image upload. City field is optional with 17 options (16 major Serbian cities + "Ostalo" for other locations).
*   **Category System**: 5 parking categories with emoji map markers:
    - 🏠 Private Parking & Garages (private)
    - 🏢 Companies (company) - requires company name, PIB (tax ID), and number of spots (dropdown 1-5). Basic plans: 3 photos per spot limit.
    - 🚚 Truck Stops (truck_stop) - custom UI with daily pricing, optional PIB field, unique pricing
    - 👥 Residential Communities (residential) - requires contact person name, optional PIB field
    - 🚗 Car Lots (car_lot)
*   **Pricing Type**: All categories support flexible pricing options (daily or monthly). Price label dynamically updates based on selection.
*   **Subscription Pricing System**: Category-based tiered pricing with Basic and Premium options:
    - **Private/Residential/Car Lot** - Basic Plans:
        - Free: Unlimited duration, 0 RSD (basic listing, no premium features)
    - **Private/Residential/Car Lot** - Premium Plans (with golden styling and top placement):
        - Monthly Premium: 30 days, 1,000 RSD
        - Half-Yearly Premium: 180 days, 5,000 RSD (17% savings)
        - Yearly Premium: 365 days, 9,000 RSD (25% savings)
    - **Truck Stops** - Basic Plans:
        - Basic Monthly: 30 days, 5,000 RSD
        - Basic Half-Yearly: 180 days, 25,000 RSD (17% savings)
        - Basic Yearly: 365 days, 40,000 RSD (33% savings)
    - **Truck Stops** - Premium Plans:
        - Premium Monthly: 30 days, 10,000 RSD
        - Premium Half-Yearly: 180 days, 50,000 RSD (17% savings)
        - Premium Yearly: 365 days, 80,000 RSD (33% savings)
    - **Companies** - Basic Plans:
        - Basic Monthly: 30 days, 3,000 RSD (up to 5 spots, 3 photos/spot)
        - Basic Half-Yearly: 180 days, 15,000 RSD (17% savings)
    - **Companies** - Premium Plans:
        - Premium Monthly: 30 days, 6,000 RSD (unlimited spots/photos)
        - Premium Half-Yearly: 180 days, 30,000 RSD (17% savings)
    - **Premium Benefits**: Golden border on map pin and list cards, top position in search results, increased visibility
    - Auto-renewal toggle available for automatic subscription renewal
    - Each parking spot has `subscriptionType`, `subscriptionExpiresAt`, `autoRenewal`, `category`, and `isPremium` fields.
*   **Search & Discovery**: Interactive map-based search with filters for location (city), availability, price, spot type, EV charging, security camera, and 24/7 availability.
*   **Booking System**: Secure booking flow with calendar selection and real-time availability.
*   **Payment Processing**: Payment methods limited to cash and bank transfer only (card payments removed).
*   **User Dashboard**: Management of bookings and owned parking spots, including a transaction history with financial summaries.
*   **Review & Rating System**: 1-5 star ratings and comments (10-1000 characters) for paid bookings, displayed on spot detail pages with average ratings.
*   **Admin Panel**: Admin access restricted to specific email (isAdmin=true in database). Located at /admin route.

### System Design Choices
*   **API Design**: RESTful API endpoints for CRUD operations on parking spots, bookings, payments, and reviews.
*   **Security**: Helmet middleware for security headers, rate limiting (200 req/15min general, 30 req/15min sensitive routes), input sanitization (`server/sanitize.ts`) for XSS prevention, server-side Zod validation, secure handling of payment tokens, VAPID keys properly secured (server-only, no VITE_ fallback), debug console logs removed from production code.
*   **Data Validation**: Zod schemas are used for robust data validation on both frontend and backend, handling type conversions for dates and other complex data.
*   **Error Handling**: Comprehensive error handling, including specific responses for unique constraint violations (e.g., duplicate reviews), trial already used (403), and invalid subscription plans (400).
*   **Geographic Scope**: Designed for Serbia, with city-based filtering and popular destination features.
*   **Subscription Logic**: Backend validates plan selection, calculates expiry dates using `shared/pricing.ts` helper functions (null for free plans), and tracks subscription type and isPremium flag per parking spot. Premium spots get golden styling on map markers, list cards, and appear first in search results.

## External Dependencies
*   **Monri Payments (Payten)**: API v2 (REST/JSON) for secure payment processing.
*   **Replit Auth**: OpenID Connect for user authentication.
*   **Replit Object Storage**: For secure storage and retrieval of parking spot images.
*   **Leaflet**: JavaScript library for interactive maps.
*   **PostgreSQL (Neon)**: Relational database hosted via Replit.
*   **next-themes**: Theme provider for dark/light mode switching.
