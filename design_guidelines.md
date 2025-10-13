# Design Guidelines: Parking Space Sharing Platform - Novi Sad

## Design Approach
**Reference-Based Approach**: Inspired by Airbnb's clean listing interface and SpotHero's parking marketplace, focusing on intuitive map-based search and simple booking flows. This is a visual-rich, experience-focused platform where trust and ease-of-use drive conversions.

## Core Design Principles
1. **Trust-Building**: Clear photography, transparent pricing, verified listings
2. **Efficiency**: Quick search-to-booking flow optimized for mobile users
3. **Localization**: Serbian language throughout with local payment methods
4. **Accessibility**: High contrast design for outdoor mobile usage

## Color System

**Primary Palette** (Provided by user):
- Primary: `#1B4332` (forest green) - CTAs, active states, key interactions
- Secondary: `#40916C` (medium green) - hover states, secondary actions
- Accent: `#52B788` (bright green) - success states, highlights, availability indicators
- Background: `#212529` (charcoal black) - main background
- Surface: `#343A40` (dark grey) - cards, elevated components
- Text: `#F8F9FA` (off-white) - primary text

**Functional Colors**:
- Success: `#52B788` (use accent green)
- Warning: `45 93% 47%` (amber for limited availability)
- Error: `0 72% 51%` (red for unavailable/errors)
- Info: `#40916C` (use secondary green)

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
- **Header**: Sticky dark surface (`#343A40`) with logo, search bar, user menu
- Search bar: Prominent with location autocomplete, date picker, price filter
- Mobile: Hamburger menu, bottom navigation for key actions (Search, Bookings, Profile)

### Cards (Parking Listings)
- Background: `#343A40` surface color
- Border radius: `rounded-lg` (8px)
- Hover: Lift with `shadow-xl`, subtle scale (1.02)
- Image: 16:9 aspect ratio, `rounded-t-lg`, lazy loaded
- Content padding: `p-4`
- Layout: Image → Location/Title → Price → Availability badge

### Map Integration
- **Interactive Map**: Mapbox GL with custom dark theme
- Markers: Green (`#52B788`) pins for available, grey for unavailable
- Cluster markers: Show count with `#1B4332` background
- Info cards: Pop up on marker click with image, price, quick book button

### Buttons
- **Primary CTA**: `bg-[#1B4332]` with `hover:bg-[#40916C]`, white text, `rounded-lg`, `px-8 py-3`
- **Secondary**: `border-2 border-[#40916C]` with transparent background, green text
- **Outline on Images**: Blurred background (`backdrop-blur-md bg-white/10`), no custom hover states
- **Icon Buttons**: 40px × 40px touch targets, centered icons from Heroicons

### Forms
- **Input Fields**: Dark surface (`#343A40`) background, `border border-[#40916C]/30`, `rounded-lg`, `px-4 py-3`
- **Focus State**: `ring-2 ring-[#52B788]` with border color change
- **Labels**: 14px Inter Medium, `#F8F9FA`, positioned above inputs
- **Validation**: Error text in red below field, success checkmark in `#52B788`

### Data Display
- **Pricing**: Large, bold green (`#52B788`) with "RSD/sat" or "BAM/sat" suffix
- **Availability Calendar**: Grid with available days in `#52B788`, booked in grey, selected with `#1B4332` background
- **Stats/Metrics**: White text on dark cards with green accent borders

### Modals & Overlays
- **Booking Modal**: Full-screen mobile, centered card desktop, `#343A40` background
- **Backdrop**: `bg-black/80` with blur
- **Payment Form**: Monri-styled inputs matching platform design
- **Confirmation**: Success icon with `#52B788` checkmark, booking details

## Key Pages Structure

### Landing/Home Page
- **Hero**: Full-width image of Novi Sad parking (Trg Slobode/Liberty Square), 70vh height, overlay with search box centered
- **How It Works**: 3-column grid (mobile stacked) with icons, titles, descriptions
- **Featured Locations**: Popular areas (Centar, Liman, Grbavica) with pricing preview
- **Trust Section**: Stats (listings, users, successful bookings) in green highlights
- **CTA Footer**: Prominent "List Your Spot" call-to-action

### Search/Browse Page
- **Map-List Split**: 60% map (fixed right), 40% scrollable listings (left) on desktop
- **Filters Bar**: Sticky top bar with location, date range, price slider, spot type
- **Mobile**: Tab toggle between map and list view
- **Results Count**: Display with sort options (price, distance, rating)

### Listing Detail Page
- **Photo Gallery**: Hero image with thumbnail strip, full-screen lightbox on click
- **Info Panel**: Fixed right sidebar (desktop) with price, book button, owner details
- **Details Section**: Location map, amenities icons, description, reviews
- **Booking Widget**: Date selector, duration, total price calculation, "Reserve" CTA

### User Dashboard
- **Sidebar Navigation**: My Bookings, My Spots, Earnings, Profile
- **Active Bookings**: Card grid with status badges, upcoming highlighted in green
- **Listing Management**: Add/edit spots with photo upload, pricing, availability calendar

## Images

**Hero Section**: Yes - large hero image required
- **Home Hero**: Panoramic photo of Novi Sad city center parking area or Liberty Square, 1920×700px minimum, with subtle dark gradient overlay for text readability
- **Listing Images**: 800×600px minimum, showing actual parking spot, surrounding area, entrance
- **Category Icons**: Heroicons for covered/uncovered, EV charging, security features
- **Trust Badges**: Monri Payments logo, verified user checkmarks

## Animations

**Minimal, Purposeful Animations**:
- Card hover: Smooth lift (`transition-all duration-200`)
- Button states: Scale feedback (`active:scale-95`)
- Modal entry: Fade + slide up (`animate-fade-in`)
- Map markers: Bounce on new results
- **No**: Auto-playing carousels, parallax scrolling, complex scroll-triggered animations

## Serbian Localization
- All UI text in Serbian Cyrillic or Latin (user preference toggle)
- Currency: RSD (Serbian Dinar) or BAM (Convertible Mark) based on location
- Date format: DD.MM.YYYY
- Time: 24-hour format
- Payment: Monri Payments (Payten) branding and flow