# Design Guidelines: CarDrop - Parking Space Sharing Platform

## Design Approach
**Reference-Based Approach**: Inspired by Airbnb's clean listing interface and SpotHero's parking marketplace, focusing on intuitive map-based search and simple booking flows. This is a visual-rich, experience-focused platform where trust and ease-of-use drive conversions.

## Core Design Principles
1. **Trust-Building**: Clear photography, transparent pricing, verified listings
2. **Efficiency**: Quick search-to-booking flow optimized for mobile users
3. **Localization**: Serbian language throughout with local payment methods
4. **Accessibility**: High contrast design for outdoor mobile usage
5. **Theme Flexibility**: Dark mode default with WhatsApp-inspired light mode option

## Color System

**Dual Theme Design**:

### Dark Mode (Default)
- Background: `#1e1e1e` (dark charcoal)
- Card/Surface: `#2a2a2a` (elevated dark)
- Text: Light/off-white for contrast
- Primary: `#40916C` (forest green) - CTAs, active states
- Accent: `#52B788` (bright green) - success states, highlights

### Light Mode (WhatsApp Cream Theme)
- Background: `#ECE5DD` (WhatsApp cream/beige)
- Card/Surface: Slightly lighter cream for elevation
- Text: Dark gray for contrast
- Primary: `#40916C` (forest green) - CTAs, active states
- Accent: `#52B788` (bright green) - success states, highlights

**Functional Colors**:
- Success: `#52B788` (accent green)
- Warning: Amber for limited availability
- Error: Red for unavailable/errors
- Info: `#40916C` (primary green)

## Typography

**Font Stack**: Inter for UI, Roboto as fallback
- **Headings**: Inter Bold (700)
  - H1: 48px / 56px (desktop), 32px / 40px (mobile)
  - H2: 36px / 44px (desktop), 28px / 36px (mobile)
  - H3: 24px / 32px (desktop), 20px / 28px (mobile)
- **Body**: Inter Regular (400), Medium (500)
  - Large: 18px / 28px
  - Base: 16px / 24px
  - Small: 14px / 20px
- **UI Elements**: Inter Medium (500)
  - Buttons: 16px / 24px
  - Labels: 14px / 20px
  - Captions: 12px / 16px

## Layout System

**Spacing Primitives**: Tailwind units of 2, 4, 8, 12, 16
- Component padding: `p-4` (16px) mobile, `p-8` (32px) desktop
- Section spacing: `py-12` (48px) mobile, `py-16` (64px) desktop
- Card gaps: `gap-4` (16px)
- Form fields: `space-y-4` (16px vertical rhythm)

**Grid System**:
- Container: `max-w-7xl` (1280px) with `px-4` horizontal padding
- Listing Grid: 1 column mobile, 2 columns tablet, 3 columns desktop
- Map + List Split: 60/40 ratio desktop, stacked mobile

**Breakpoints**:
- Mobile: base (< 768px)
- Tablet: md (768px+)
- Desktop: lg (1024px+)
- Wide: xl (1280px+)

## Component Library

### Navigation
- **Header**: Sticky with theme-aware background, logo, search bar, user menu, theme toggle
- Search bar: Prominent with location autocomplete, filters
- Mobile: Bottom navigation for key actions (Search, Bookings, Profile)

### Theme Toggle
- Located in header for easy access
- Sun/Moon icons with smooth transition
- Persists user preference via next-themes

### Cards (Parking Listings)
- Background: Theme-aware card background
- Border radius: `rounded-lg` (8px)
- Hover: Lift with shadow, subtle scale (1.02)
- Image: 16:9 aspect ratio, `rounded-t-lg`, lazy loaded
- Content padding: `p-4`
- Layout: Image -> Location/Title -> Price -> Availability badge

### Map Integration
- **Interactive Map**: Leaflet with theme-aware styling
- Markers: Green pins for available, grey for unavailable
- Cluster markers: Show count with primary background
- Info cards: Pop up on marker click with image, price, quick book button

### Buttons
- **Primary CTA**: Primary green background with white text, `rounded-lg`, `px-8 py-3`
- **Secondary**: Border with transparent background, green text
- **Outline on Images**: Blurred background (`backdrop-blur-md`), no custom hover states
- **Icon Buttons**: 40px x 40px touch targets, centered icons from Lucide

### Forms
- **Input Fields**: Theme-aware background, subtle border, `rounded-lg`, `px-4 py-3`
- **Focus State**: Ring with accent color
- **Labels**: 14px Inter Medium, positioned above inputs
- **Validation**: Error text in red below field, success checkmark in accent color

### Data Display
- **Pricing**: Large, bold green with "RSD/sat" suffix
- **Availability Calendar**: Grid with available days in accent, booked in muted
- **Stats/Metrics**: Theme-aware text with green accent borders

### Modals & Overlays
- **Booking Modal**: Full-screen mobile, centered card desktop, theme-aware background
- **Backdrop**: Dark with blur
- **Confirmation**: Success icon with accent checkmark, booking details

## Key Pages Structure

### Landing/Home Page
- **Hero**: Full-width image with dark overlay, search box centered
- **How It Works**: 3-column grid (mobile stacked) with icons, titles, descriptions
- **Featured Locations**: Popular Serbian cities with pricing preview
- **Trust Section**: Stats (listings, users, bookings) in green highlights
- **CTA Footer**: Prominent "List Your Spot" call-to-action

### Search/Browse Page
- **Map-List Split**: 60% map (fixed right), 40% scrollable listings (left) on desktop
- **Filters Bar**: Sticky top bar with city, price slider, spot type, EV charging, camera, 24/7
- **Mobile**: Tab toggle between map and list view
- **Results Count**: Display with sort options

### Listing Detail Page
- **Photo Gallery**: Hero image with thumbnail strip
- **Info Panel**: Fixed right sidebar (desktop) with price, book button, owner details
- **Details Section**: Location map, amenities icons, description, reviews
- **Booking Widget**: Date selector, total price, "Reserve" CTA

### User Dashboard
- **Sidebar Navigation**: My Bookings, My Spots, Earnings, Profile
- **Active Bookings**: Card grid with status badges
- **Listing Management**: Add/edit spots with photo upload, pricing, availability

## Serbian Localization
- All UI text in Serbian
- Currency: RSD (Serbian Dinar)
- Date format: DD.MM.YYYY
- Time: 24-hour format
- Payment: Cash and bank transfer options
