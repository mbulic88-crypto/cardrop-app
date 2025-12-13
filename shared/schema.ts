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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  phoneNumber: varchar("phone_number"),
  hasUsedFreeTrial: boolean("has_used_free_trial").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Parking spots table
export const parkingSpots = pgTable("parking_spots", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  pricePerHour: decimal("price_per_hour", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default('RSD'),
  spotType: varchar("spot_type", { length: 50 }).notNull(), // covered, uncovered, garage
  hasEvCharging: boolean("has_ev_charging").notNull().default(false),
  hasSecurityCamera: boolean("has_security_camera").notNull().default(false),
  is24Hours: boolean("is_24_hours").notNull().default(true),
  imageUrls: text("image_urls").array().notNull().default(sql`ARRAY[]::text[]`),
  phone: varchar("phone", { length: 50 }).notNull().default(''),
  paymentType: varchar("payment_type", { length: 50 }).notNull().default('cash'), // cash, bank_transfer, card_monri
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  subscriptionType: varchar("subscription_type", { length: 50 }).notNull().default('trial'), // trial, monthly, half_yearly, yearly
  subscriptionExpiresAt: timestamp("subscription_expires_at"),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
    phone: z.string().min(5, "Telefon mora imati najmanje 5 karaktera").max(50, "Telefon može imati maksimalno 50 karaktera"),
    paymentType: z.enum(['cash', 'bank_transfer', 'card_monri'], {
      errorMap: () => ({ message: "Tip plaćanja mora biti: Keš, Preko računa, ili Kartično" })
    }),
    contactEmail: z.string().email("Unesite validnu email adresu"),
  });

export type InsertParkingSpot = z.infer<typeof insertParkingSpotSchema>;
export type ParkingSpot = typeof parkingSpots.$inferSelect;

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

export type InsertBooking = z.infer<typeof insertBookingSchema>;
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
