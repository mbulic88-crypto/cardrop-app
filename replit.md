# ParkIN - Parking Space Sharing Platform

## Overview
A web-based parking space sharing application for Serbia, where users can rent out their paid parking spots when not in use. The platform features a modern black and green design with a custom logo, tailored for the Serbian market, integrates with Monri Payments (Payten) for transactions, and provides an intuitive experience across both mobile and desktop devices.

## Project Architecture
- **Frontend**: React with TypeScript, Tailwind CSS, Shadcn UI components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL (Neon-backed via Replit)
- **Authentication**: Replit Auth (OpenID Connect)
- **Payment**: Monri Payments (Payten) API v2

## Current State
### Completed MVP Features
- ✅ Database schema with users, parking spots, and bookings tables
- ✅ Design system configured with black/green color scheme (#1B4332, #40916C, #52B788, #212529, #343A40, #F8F9FA)
- ✅ Authentication with Replit Auth (OIDC)
- ✅ **Language Toggle** - Serbian/English interface with localStorage persistence on landing page
- ✅ **Backend API routes** - Complete CRUD operations for parking spots, bookings, payments
- ✅ **Object Storage integration** - Photo upload with Replit Object Storage, ACL security framework
- ✅ **Frontend pages:**
  - Landing page for logged-out users
  - Home page with search, filters, and **interactive map view (Leaflet)**
  - Spot detail page with booking widget
  - Add spot page with **image upload functionality**
  - My bookings page
  - **Transaction history page** with financial summaries
  - Payment processing page (Monri integration)
- ✅ **Map-based search** - Interactive Leaflet map with markers, popups, and navigation
- ✅ **Photo upload system** - Secure image storage with presigned URLs and ACL policies
- ✅ **Transaction history** - Financial dashboard showing paid/refunded transactions
- ✅ **Terms & Conditions** - Legal disclaimer page with acceptance requirement before login
- ✅ **Review/Rating System** - Complete review functionality for paid bookings:
  - Review submission dialog with 1-5 star rating and comment validation
  - Display reviews on spot detail pages with average rating
  - Unique constraint preventing duplicate reviews per booking

## Features
1. **User Registration & Authentication**: Replit Auth with profile management for parking space owners and renters
   - Terms & Conditions acceptance required before login
   - Liability disclaimer protecting site/owner from delivery failures
2. **Listing Management**: Users can list available parking spaces with location, time slots, and pricing in RSD/BAM
3. **Search & Discovery**: Interactive search and filtering by location, availability, price, and time slots
4. **Booking System**: Secure booking flow with calendar selection and real-time availability
5. **Payment Processing**: Monri Payments (Payten) integration for secure transactions
6. **User Dashboard**: Manage bookings and owned parking spots
7. **Review & Rating System**: 
   - Renters can review spot owners after paid bookings
   - 1-5 star ratings with detailed comments (10-1000 characters)
   - Reviews displayed on spot detail pages with average ratings
   - One review per booking (unique constraint)

## Design Guidelines
- **Colors**: 
  - Primary: #1B4332 (forest green)
  - Secondary: #40916C (medium green)
  - Accent: #52B788 (bright green)
  - Background: #212529 (charcoal black)
  - Surface: #343A40 (dark grey)
  - Text: #F8F9FA (off-white)
- **Typography**: Inter (primary), Roboto (fallback)
- **Spacing**: 16px base unit, mobile-first responsive design
- **Language**: Serbian/English toggle on landing page with localStorage persistence

## Database Schema
### Users Table
- Replit Auth integration
- Profile information (name, email, phone, profile image)

### Parking Spots Table
- Title, description, address
- Location coordinates (latitude, longitude)
- Pricing (per hour in RSD/BAM)
- Spot type (covered, uncovered, garage)
- Features (EV charging, security camera, 24/7 availability)
- Owner relationship

### Bookings Table
- Spot and renter relationships
- Time slots (start/end time)
- Total price and currency
- Status tracking (pending, confirmed, completed, cancelled)
- Payment status (pending, paid, refunded)
- Monri transaction details

### Reviews Table
- Booking relationship (unique constraint - one review per booking)
- Reviewer (renter) and spot owner relationships
- Rating (1-5 stars)
- Comment (10-1000 characters)
- Timestamps (created/updated)

## API Endpoints
### Parking Spots
- `GET /api/parking-spots` - List all active parking spots
- `GET /api/parking-spots/:id` - Get spot details
- `POST /api/parking-spots` - Create new parking spot (authenticated)

### Bookings
- `GET /api/bookings` - Get user bookings (authenticated)
- `GET /api/bookings/:id/can-review` - Check if user can review booking
- `POST /api/bookings` - Create booking (authenticated)

### Reviews
- `POST /api/reviews` - Create review (authenticated, requires paid booking)
- `GET /api/reviews/owner/:ownerId` - Get reviews for owner
- `GET /api/reviews/spot/:spotId` - Get reviews for parking spot
- `GET /api/reviews/booking/:bookingId` - Get review for specific booking (authenticated)

### Payments
- `POST /api/payments/monri` - Process Monri payment

### Users
- `GET /api/users/:id` - Get user details
- `GET /api/auth/user` - Get current authenticated user

## Monri Payments Integration
- Using API v2 (REST/JSON)
- Test environment: https://ipgtest.monri.com
- Authentication: WP3-v2 scheme with SHA512 digest
- Payment flow: Create payment → Redirect to Monri → Callback confirmation

## Recent Changes (November 13, 2025)

### Home Page Updates
- **Page Title Change**: Changed from personalized "Pozdrav, {userName}!" to generic "Izaberite Parking"
  - More professional and action-oriented heading
  - Removes dependency on user authentication state
- **Header Simplification**: Removed redundant "Odjavi se" (Logout) button
  - Streamlined header with only essential navigation
  - "Početna" button now links to landing page (/) instead of /home
- **City Filter Feature**: Added comprehensive city dropdown filter next to search bar
  - 16 Serbian cities available: Svi Gradovi (default), Beograd, Novi Sad, Niš, Kragujevac, Subotica, Zrenjanin, Pančevo, Čačak, Kraljevo, Smederevo, Leskovac, Užice, Valjevo, Šabac, Sombor
  - Optional filter - "Svi Gradovi" shows all parking spots
  - Filters parking spots by city name in address (case-insensitive)
  - Works in combination with search bar and other filters (price, spot type)
  - Responsive layout with dropdown next to search bar
  - data-testid="select-city-filter" for testing

### Language Toggle Feature
- **Functional Language Switcher**: Added working language toggle button (ENG ↔ SRP) on landing page
  - State management with React useState and useEffect
  - Language preference saved to localStorage (key: "parkin-language")
  - Default language: Serbian (sr)
  - Full translations for all landing page content:
    - Hero section (title, subtitle, CTAs)
    - How It Works section (all 3 steps)
    - Popular Destinations heading
    - Trust section labels
    - CTA section
    - Footer (Terms button, copyright)
  - Button displays "ENG" in Serbian mode, "SRP" in English mode
  - Instant UI updates when language changes

### Popular Destinations Redesign
- **Geographic Scope**: Changed from Novi Sad neighborhoods to Serbian cities
  - Old: Centar, Liman, Grbavica (Novi Sad specific)
  - New: Beograd (Belgrade), Novi Sad, Niš, Kragujevac
- **Cleaner Display**: Removed clutter from city cards
  - Eliminated parking spot counts (e.g., "45+ dostupnih mesta")
  - Removed average pricing info (e.g., "od 150 RSD/sat")
  - Now shows only city names in clean, centered cards
- **Functionality**: Each city card links to /home?search={cityName} for quick city-based search
- **Responsive Layout**: Grid adjusted to 4 columns on desktop (grid-cols-1 md:grid-cols-4)
- **Bilingual Support**: City names adapt to selected language (e.g., "Beograd" vs "Belgrade")

## Recent Changes (October 13, 2025)

### Booking Date Validation Fix
- **Problem**: Booking API was rejecting valid reservations with "Expected date, received string" error
- **Root Cause**: Frontend sends dates as ISO strings (JSON serialization), but backend Zod schema expected Date objects
- **Solution**: Updated `insertBookingSchema` in `shared/schema.ts` to accept both Date objects and ISO strings using `z.union` with transform
- **Result**: Booking flow now works correctly - users can select date/time, submit booking, and get redirected to payment
- **Testing**: E2E test confirms booking creation succeeds with 201 response and payment redirect

### Public Browsing with Authentication-Protected Actions
- **Routing Architecture Change**: Refactored App.tsx router to enable public access to all pages
  - Removed authentication-based conditional routing
  - All routes (/, /home, /spot/:id, /add-spot, /my-bookings, /transactions) now publicly accessible
  - Landing page always at "/" for unauthenticated users
  - Home page at "/home" for browsing parking spots
- **Authentication Enforcement**: Moved from route-level to action-level protection
  - Public users can browse parking spots without login
  - LoginRequiredDialog appears when attempting protected actions (booking, adding spots)
  - My Bookings and Transactions pages show LoginRequiredDialog if accessed without auth
- **LoginRequiredDialog Integration**:
  - Custom-branded dialog with ParkIN colors (#52B788 accent green)
  - Serbian language messages for all scenarios:
    - Booking: "Za rezervaciju parking mesta potrebna je prijava na nalog."
    - Add Spot: "Za dodavanje parking mesta potrebna je prijava na nalog."
    - My Bookings: "Za pregled rezervacija potrebna je prijava na nalog."
    - Transactions: "Za pregled transakcija potrebna je prijava na nalog."
  - Dialog redirects to /api/login with redirect_uri for post-auth return
- **Testing**: E2E tests confirm LoginRequiredDialog appears correctly on Add Spot and Spot Detail pages

### Terms & Conditions System
- **Terms Page**: Created `/terms` route with comprehensive liability disclaimer
  - Clear statement that site/owner not responsible for owner delivery failures
  - Legal protection for platform and parking spot owners
- **Terms Acceptance Dialog**: Mandatory acceptance before login/signup
  - Checkbox stored in localStorage
  - Blocks access to authenticated features until accepted
  - Integrated into login redirect flow

### Review & Rating System
- **Database Schema**: 
  - Added `reviews` table with unique constraint on bookingId
  - Relationships: reviewer (renter), spotOwner, booking
  - Rating (1-5 stars) and comment (10-1000 chars) with validation
- **Backend API**:
  - `POST /api/reviews` - Create review with server-side security (reviewerId/spotOwnerId injection)
  - `GET /api/reviews/spot/:spotId` - Fetch reviews for parking spot (JOIN with bookings)
  - `GET /api/reviews/owner/:ownerId` - Get all reviews for owner
  - `GET /api/reviews/booking/:bookingId` - Check existing review for booking
  - `GET /api/bookings/:id/can-review` - Verify review eligibility (paid booking by current user)
- **Frontend Components**:
  - `ReviewDialog`: Star rating selector, comment textarea with character counter (10-1000 validation)
  - Integrated into My Bookings page with "Ostavi Recenziju" button for eligible bookings
  - Review display on Spot Detail page with average rating and star indicators
  - Visual feedback for review status (button/badge states)

### Navigation & UX Improvements
- **Authentication Flow**: Fixed 404 errors with proper `/api/login` redirects using redirect_uri
- **Logo Navigation**: Logo and app name in all page headers now link to home page
- **Consistent Headers**: Added unified header design across all pages
- **Direct Navigation**: Landing page CTAs route directly to app pages

### Technical Implementation
- **Security**: Server-side injection of reviewerId and spotOwnerId to prevent tampering
- **Race Condition Protection**: Unique constraint with 409 error handling for duplicate reviews
- **Type Safety**: Full TypeScript integration with Zod validation schemas
- **Query Invalidation**: Proper cache management for reviews and bookings

## Branding & Geographic Scope
- **Application Name**: ParkIN (rebranded from ParkShare)
- **Logo**: Custom ParkIN logo image (`Parkin pic_1763062246399.png`) used across all page headers
- **Geographic Scope**: Expanded from Novi Sad-only to all of Serbia
- **Language Toggle**: Moved from home page to landing page header for better UX

## Next Steps
1. Add review display on owner profile pages
2. Implement review pagination for high-volume spots
3. Add review filtering/sorting options
4. Consider adding review helpful votes/reporting
5. Deploy to production
