# ParkShare - Parking Space Sharing Platform

## Overview
A web-based parking space sharing application for Novi Sad, Serbia, where users can rent out their paid parking spots when not in use. The platform features a modern black and green design tailored for the Serbian market, integrates with Monri Payments (Payten) for transactions, and provides an intuitive experience across both mobile and desktop devices.

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
- ✅ Serbian language interface throughout
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

### In Progress
- Enhanced booking calendar with visual availability display

## Features
1. **User Registration & Authentication**: Replit Auth with profile management for parking space owners and renters
2. **Listing Management**: Users can list available parking spaces with location, time slots, and pricing in RSD/BAM
3. **Search & Discovery**: Interactive search and filtering by location, availability, price, and time slots
4. **Booking System**: Secure booking flow with calendar selection and real-time availability
5. **Payment Processing**: Monri Payments (Payten) integration for secure transactions
6. **User Dashboard**: Manage bookings and owned parking spots

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
- **Language**: Serbian (Latin and Cyrillic support)

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

## API Endpoints (To Be Implemented)
- `GET /api/parking-spots` - List all active parking spots
- `GET /api/parking-spots/:id` - Get spot details
- `POST /api/parking-spots` - Create new parking spot (authenticated)
- `GET /api/bookings` - Get user bookings (authenticated)
- `POST /api/bookings` - Create booking (authenticated)
- `POST /api/payments/monri` - Process Monri payment
- `GET /api/users/:id` - Get user details

## Monri Payments Integration
- Using API v2 (REST/JSON)
- Test environment: https://ipgtest.monri.com
- Authentication: WP3-v2 scheme with SHA512 digest
- Payment flow: Create payment → Redirect to Monri → Callback confirmation

## Recent Changes (October 13, 2024)
### Navigation & UX Improvements
- **Logo Navigation**: Logo and app name in all page headers now link to home page
- **Consistent Headers**: Added unified header design across all pages with:
  - ParkShare logo (links to home)
  - "Početna Stranica" button for quick home navigation  
  - "ENG" language toggle button (placeholder for English translation)
- **Direct Navigation**: Landing page CTAs now route directly to app pages:
  - "Pronađite Vaše Mesto" → `/home` (search parking)
  - "Iznajmite Vaše Mesto" → `/add-spot` (list your spot)
- **Updated Button Labels**: Clearer action buttons throughout the app
- **Improved Spacing**: Better visual hierarchy on landing page (increased title/subtitle separation)

### Technical Fixes
- Fixed `apiRequest` function to return JSON data instead of Response object
- Resolved TypeScript errors across all pages
- Updated all pages with consistent navigation patterns

## Next Steps
1. Implement backend API routes
2. Set up Monri Payments integration
3. Connect frontend to backend
4. Test complete user journey
5. Deploy to production
