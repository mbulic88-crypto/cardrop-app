import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"),
  authProvider: varchar("auth_provider", { length: 20 }).notNull().default('local'),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phoneNumber: varchar("phone_number"),
  hasUsedFreeTrial: boolean("has_used_free_trial").notNull().default(false),
  isAdmin: boolean("is_admin").notNull().default(false),
  mapNickname: varchar("map_nickname"),
  mapAvatarId: integer("map_avatar_id"),
  mapHackTrialStartedAt: timestamp("map_hack_trial_started_at"),
  mapHackPlan: varchar("map_hack_plan", { length: 20 }),
  mapHackPlanExpiresAt: timestamp("map_hack_plan_expires_at"),
  mapHackStripeSessionId: varchar("map_hack_stripe_session_id"),
  mapProfileLastChangedAt: timestamp("map_profile_last_changed_at"),
  mapNotificationsEnabled: boolean("map_notifications_enabled").notNull().default(true),
  mapPrivacyAcceptedAt: timestamp("map_privacy_accepted_at"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  savedLicensePlate: varchar("saved_license_plate", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Map Hack consumed Stripe sessions (replay prevention)
export const mapHackConsumedSessions = pgTable("map_hack_consumed_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  stripeSessionId: varchar("stripe_session_id").notNull().unique(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: varchar("plan", { length: 30 }).notNull(),
  activatedAt: timestamp("activated_at").defaultNow().notNull(),
});

// Parking spots table
export const parkingSpots = pgTable("parking_spots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: varchar("category", { length: 50 }).notNull().default('private'), // private, company, truck, residential, carlot
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  pricePerHour: decimal("price_per_hour", { precision: 10, scale: 2 }),
  pricePerDay: decimal("price_per_day", { precision: 10, scale: 2 }),
  pricePerWeek: decimal("price_per_week", { precision: 10, scale: 2 }),
  pricePerMonth: decimal("price_per_month", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 3 }).notNull().default('RSD'),
  spotType: varchar("spot_type", { length: 50 }).notNull(), // covered, uncovered, garage
  hasEvCharging: boolean("has_ev_charging").notNull().default(false),
  hasSecurityCamera: boolean("has_security_camera").notNull().default(false),
  is24Hours: boolean("is_24_hours").notNull().default(true),
  imageUrls: text("image_urls").array().notNull().default(sql`ARRAY[]::text[]`),
  phone: varchar("phone", { length: 50 }).notNull().default(''),
  paymentType: varchar("payment_type", { length: 50 }).notNull().default('cash'), // cash, bank_transfer
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  // Advertiser type for all categories
  advertiserType: varchar("advertiser_type", { length: 50 }).notNull().default('owner'), // owner, agency, company
  // Company specific fields
  companyName: varchar("company_name", { length: 255 }),
  pib: varchar("pib", { length: 20 }),
  numberOfSpots: integer("number_of_spots"),
  // Residential specific fields
  contactPerson: varchar("contact_person", { length: 255 }),
  // Pricing type for all categories (hourly/daily/monthly)
  pricingType: varchar("pricing_type", { length: 20 }).notNull().default('daily'), // hourly, daily, monthly
  // Subscription fields
  subscriptionType: varchar("subscription_type", { length: 50 }).notNull().default('standard'), // standard, silver, gold
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  autoRenewal: boolean("auto_renewal").notNull().default(false),
  isPremium: boolean("is_premium").notNull().default(false),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Admin-managed fields
  parkingNumber: varchar("parking_number", { length: 20 }),
  stripeLink: varchar("stripe_link", { length: 500 }),
  stripeLinkActive: boolean("stripe_link_active").notNull().default(false),
  stripeProductId: varchar("stripe_product_id", { length: 100 }),
  // How many independent bookable spaces this listing has (default 1)
  totalSpaces: integer("total_spaces").notNull().default(1),
  // Pending changes: owner edits are held here until next midnight UTC+1
  pendingChanges: jsonb("pending_changes").$type<Record<string, unknown>>(),
  pendingChangesFrom: timestamp("pending_changes_from"),
});

export const parkingSpotsRelations = relations(parkingSpots, ({ one, many }) => ({
  owner: one(users, {
    fields: [parkingSpots.ownerId],
    references: [users.id],
  }),
  bookings: many(bookings),
}));

export const insertParkingSpotSchema = createInsertSchema(parkingSpots)
  .omit({
    id: true,
    ownerId: true,
    subscriptionExpiresAt: true,
    stripePaymentIntentId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    category: z.enum(['private', 'company', 'truck', 'residential', 'carlot']).default('private'),
    phone: z.string().min(5, "Telefon mora imati najmanje 5 karaktera").max(50, "Telefon može imati maksimalno 50 karaktera"),
    paymentType: z.enum(['cash', 'bank_transfer'], {
      errorMap: () => ({ message: "Tip plaćanja mora biti: Keš ili Preko računa" })
    }),
    contactEmail: z.string().email("Unesite validnu email adresu"),
    advertiserType: z.enum(['owner', 'agency', 'company']).default('owner'),
    companyName: z.string().optional(),
    pib: z.string().optional(),
    numberOfSpots: z.number().optional(),
    contactPerson: z.string().optional(),
    totalSpaces: z.number().int().min(1).max(100).default(1),
    pricingType: z.enum(['hourly', 'daily', 'monthly']).default('daily'),
    parkingNumber: z.string().max(20).optional(),
    stripeLink: z.string().max(500).optional(),
    stripeLinkActive: z.boolean().default(false),
    subscriptionType: z.enum(['standard', 'silver', 'gold']).default('standard'),
    autoRenewal: z.boolean().default(false),
    isPremium: z.boolean().default(false),
  });

export type InsertParkingSpot = z.infer<typeof insertParkingSpotSchema>;
export type ParkingSpot = typeof parkingSpots.$inferSelect;

// Explicit whitelist of fields an owner may edit.
// Adding a new field here automatically permits it in both the API validator and the pending-changes applier.
export const OWNER_EDITABLE_FIELDS = [
  'title', 'description', 'address', 'city',
  'latitude', 'longitude',
  'pricePerHour', 'currency', 'paymentType',
  'spotType', 'hasEvCharging', 'hasSecurityCamera', 'is24Hours',
  'phone', 'contactEmail',
  'pricingType', 'advertiserType', 'companyName', 'pib', 'numberOfSpots', 'contactPerson',
  'totalSpaces', 'imageUrls',
] as const;

// Edit schema: only explicitly whitelisted fields — nothing else can enter.
export const parkingSpotEditSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  address: z.string().min(1),
  city: z.string().optional().nullable(),
  latitude: z.string(),
  longitude: z.string(),
  pricePerHour: z.string(),
  currency: z.string(),
  paymentType: z.string().optional().nullable(),
  spotType: z.string(),
  hasEvCharging: z.boolean().optional().default(false),
  hasSecurityCamera: z.boolean().optional().default(false),
  is24Hours: z.boolean().optional().default(false),
  phone: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  pricingType: z.string().optional().nullable(),
  advertiserType: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  pib: z.string().optional().nullable(),
  numberOfSpots: z.number().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  totalSpaces: z.number().int().min(1).max(100).optional().nullable(),
  imageUrls: z.array(z.string()).optional(),
});

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  spotId: varchar("spot_id").notNull().references(() => parkingSpots.id, { onDelete: 'cascade' }),
  renterId: varchar("renter_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default('RSD'),
  status: varchar("status", { length: 50 }).notNull().default('pending'), // pending, confirmed, completed, cancelled
  paymentStatus: varchar("payment_status", { length: 50 }).notNull().default('pending'), // pending, paid, refunded
  monriOrderNumber: varchar("monri_order_number", { length: 255 }),
  monriTransactionId: varchar("monri_transaction_id", { length: 255 }),
  licensePlate: varchar("license_plate", { length: 30 }),
  renterPhone: varchar("renter_phone", { length: 30 }),
  spaceNumber: integer("space_number").notNull().default(1),
  bookingStripeSessionId: varchar("booking_stripe_session_id", { length: 255 }).unique(),
  paymentMethod: varchar("payment_method", { length: 20 }).default('cash'), // 'instant' | 'cash' | 'credit'
  pricingType: varchar("pricing_type", { length: 20 }).notNull().default('daily'), // hourly, daily, weekly, monthly
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Date preprocessor that accepts both Date objects and ISO strings
const dateSchema = z.preprocess((val) => {
  if (val instanceof Date) return val;
  if (typeof val === 'string') return new Date(val);
  return val;
}, z.date().refine((date) => !isNaN(date.getTime()), {
  message: "Invalid date",
}));

export const insertBookingSchema = createInsertSchema(bookings)
  .omit({
    id: true,
    renterId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    startTime: dateSchema,
    endTime: dateSchema,
  });

// Client-facing create schema: only user-supplied fields.
// totalPrice, status, paymentStatus are always computed server-side.
export const bookingCreateSchema = z.object({
  spotId: z.string().min(1),
  startTime: dateSchema,
  endTime: dateSchema,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type BookingCreate = z.infer<typeof bookingCreateSchema>;
export type Booking = typeof bookings.$inferSelect;

// Reviews table - for renters to review spot owners after payment
// MUST be declared before bookingsRelations to avoid ReferenceError
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  bookingId: varchar("booking_id").notNull().references(() => bookings.id, { onDelete: 'cascade' }).unique(), // Unique constraint to prevent duplicate reviews
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // The renter who left the review
  spotOwnerId: varchar("spot_owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // The owner being reviewed
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, {
    fields: [reviews.bookingId],
    references: [bookings.id],
  }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
  }),
  spotOwner: one(users, {
    fields: [reviews.spotOwnerId],
    references: [users.id],
  }),
}));

export const insertReviewSchema = createInsertSchema(reviews)
  .omit({
    id: true,
    reviewerId: true,
    spotOwnerId: true, // Server will calculate this from booking
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    rating: z.number().min(1).max(5),
    comment: z.string().min(10, "Komentar mora imati najmanje 10 karaktera").max(1000, "Komentar može imati maksimalno 1000 karaktera"),
  });

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

// Bookings relations - MUST be after reviews table declaration
export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  spot: one(parkingSpots, {
    fields: [bookings.spotId],
    references: [parkingSpots.id],
  }),
  renter: one(users, {
    fields: [bookings.renterId],
    references: [users.id],
  }),
  review: one(reviews),
}));

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedSpots: many(parkingSpots),
  bookings: many(bookings),
  reviewsGiven: many(reviews, { relationName: "reviewsGiven" }),
  reviewsReceived: many(reviews, { relationName: "reviewsReceived" }),
}));

// Free trial period table - to track promotional free period
export const freeTrialPeriod = pgTable("free_trial_period", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export type FreeTrialPeriod = typeof freeTrialPeriod.$inferSelect;

// Push subscriptions table for Web Push notifications
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  unique("push_subscriptions_user_endpoint_unique").on(table.userId, table.endpoint),
]);

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// Messages table for user-to-user communication
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  receiverId: varchar("receiver_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  spotId: varchar("spot_id").references(() => parkingSpots.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messagesRelations = relations(messages, ({ one }) => ({
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
  }),
  spot: one(parkingSpots, {
    fields: [messages.spotId],
    references: [parkingSpots.id],
  }),
}));

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  senderId: true,
  isRead: true,
  createdAt: true,
}).extend({
  content: z.string().min(1, "Poruka ne može biti prazna").max(1000, "Poruka može imati maksimalno 1000 karaktera"),
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Sales listings table - for selling parking spots/garages
export const salesListings = pgTable("sales_listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sellerId: varchar("seller_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  price: decimal("price", { precision: 12, scale: 2 }).notNull(),
  area: decimal("area", { precision: 10, scale: 2 }).notNull(), // square meters
  description: text("description"),
  advertiserType: varchar("advertiser_type", { length: 50 }).notNull(), // owner, agency, company
  propertyType: varchar("property_type", { length: 50 }).notNull(), // garage, open_parking, closed_parking, truck_parking, building_garage, warehouse_parking, other
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }),
  condition: varchar("condition", { length: 50 }).notNull().default('used'), // new, used, renovated
  phone: varchar("phone", { length: 50 }).notNull(),
  numberOfSpots: integer("number_of_spots"),
  features: text("features").array().notNull().default(sql`ARRAY[]::text[]`), // electricity, water, heating, camera, ramp, remote_control
  imageUrls: text("image_urls").array().notNull().default(sql`ARRAY[]::text[]`),
  subscriptionType: varchar("subscription_type", { length: 50 }).notNull().default('standard'), // standard, silver, gold
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  isPremium: boolean("is_premium").notNull().default(false),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const salesListingsRelations = relations(salesListings, ({ one }) => ({
  seller: one(users, {
    fields: [salesListings.sellerId],
    references: [users.id],
  }),
}));

export const insertSalesListingSchema = createInsertSchema(salesListings)
  .omit({
    id: true,
    sellerId: true,
    subscriptionExpiresAt: true,
    stripeSessionId: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    title: z.string().min(3, "Naslov mora imati najmanje 3 karaktera").max(255, "Naslov može imati maksimalno 255 karaktera"),
    price: z.string().or(z.number()).transform(v => String(v)),
    area: z.string().or(z.number()).transform(v => String(v)),
    advertiserType: z.enum(['owner', 'agency', 'company']),
    propertyType: z.enum(['garage', 'open_parking', 'closed_parking', 'truck_parking', 'building_garage', 'warehouse_parking', 'other']),
    condition: z.enum(['new', 'used', 'renovated']).default('used'),
    phone: z.string().min(5, "Telefon mora imati najmanje 5 karaktera"),
    description: z.string().optional(),
    numberOfSpots: z.number().optional(),
    features: z.array(z.string()).default([]),
    imageUrls: z.array(z.string()).default([]),
    subscriptionType: z.enum(['standard', 'silver', 'gold']).default('standard'),
    isPremium: z.boolean().default(false),
  });

export type InsertSalesListing = z.infer<typeof insertSalesListingSchema>;
export type SalesListing = typeof salesListings.$inferSelect;

// ─── Map Hack NS Tables ────────────────────────────────────────────────────

export const mapMarkerTypeEnum = pgEnum("map_marker_type", [
  "zlatni_minut",
  "pauk",
  "stek",
  "safe_zone",
  "radar",
  "kamera",
]);

export const mapMarkers = pgTable("map_markers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: mapMarkerTypeEnum("type").notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  label: varchar("label", { length: 100 }),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

export const insertMapMarkerSchema = createInsertSchema(mapMarkers).omit({
  id: true,
  createdAt: true,
});
export type InsertMapMarker = z.infer<typeof insertMapMarkerSchema>;
export type MapMarker = typeof mapMarkers.$inferSelect;

export const mapChatMessages = pgTable("map_chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  mapNickname: varchar("map_nickname", { length: 30 }).notNull(),
  avatarId: integer("avatar_id").notNull().default(1),
  text: varchar("text", { length: 280 }),
  audioUrl: varchar("audio_url"),
  isSystem: boolean("is_system").notNull().default(false),
  replyToId: varchar("reply_to_id"),
  replyToNickname: varchar("reply_to_nickname", { length: 30 }),
  replyToText: varchar("reply_to_text", { length: 120 }),
  lat: decimal("lat", { precision: 10, scale: 7 }),
  lng: decimal("lng", { precision: 10, scale: 7 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMapChatMessageSchema = createInsertSchema(mapChatMessages).omit({
  id: true,
  createdAt: true,
});
export type InsertMapChatMessage = z.infer<typeof insertMapChatMessageSchema>;
export type MapChatMessage = typeof mapChatMessages.$inferSelect;

export const mapSafeZones = pgTable("map_safe_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  radiusMeters: integer("radius_meters").notNull().default(300),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertMapSafeZoneSchema = createInsertSchema(mapSafeZones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMapSafeZone = z.infer<typeof insertMapSafeZoneSchema>;
export type MapSafeZone = typeof mapSafeZones.$inferSelect;

export const mapWatchAreas = pgTable("map_watch_areas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  radiusMeters: integer("radius_meters").notNull().default(300),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMapWatchAreaSchema = createInsertSchema(mapWatchAreas).omit({
  id: true,
  createdAt: true,
});
export type InsertMapWatchArea = z.infer<typeof insertMapWatchAreaSchema>;
export type MapWatchArea = typeof mapWatchAreas.$inferSelect;
