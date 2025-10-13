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
  city: varchar("city", { length: 100 }).notNull().default('Novi Sad'),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  pricePerHour: decimal("price_per_hour", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull().default('RSD'),
  spotType: varchar("spot_type", { length: 50 }).notNull(), // covered, uncovered, garage
  hasEvCharging: boolean("has_ev_charging").notNull().default(false),
  hasSecurityCamera: boolean("has_security_camera").notNull().default(false),
  is24Hours: boolean("is_24_hours").notNull().default(true),
  imageUrls: text("image_urls").array().notNull().default(sql`ARRAY[]::text[]`),
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

export const insertParkingSpotSchema = createInsertSchema(parkingSpots).omit({
  id: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
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

export const bookingsRelations = relations(bookings, ({ one }) => ({
  spot: one(parkingSpots, {
    fields: [bookings.spotId],
    references: [parkingSpots.id],
  }),
  renter: one(users, {
    fields: [bookings.renterId],
    references: [users.id],
  }),
}));

export const insertBookingSchema = createInsertSchema(bookings).omit({
  id: true,
  renterId: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  ownedSpots: many(parkingSpots),
  bookings: many(bookings),
}));
