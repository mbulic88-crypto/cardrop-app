import {
  users,
  parkingSpots,
  bookings,
  reviews,
  freeTrialPeriod,
  type User,
  type UpsertUser,
  type ParkingSpot,
  type InsertParkingSpot,
  type Booking,
  type InsertBooking,
  type Review,
  type InsertReview,
  type FreeTrialPeriod,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined>;
  
  // Parking spots operations
  getAllParkingSpots(): Promise<ParkingSpot[]>;
  getParkingSpot(id: string): Promise<ParkingSpot | undefined>;
  getUserParkingSpots(ownerId: string): Promise<ParkingSpot[]>;
  createParkingSpot(spot: InsertParkingSpot & { ownerId: string }): Promise<ParkingSpot>;
  updateParkingSpot(id: string, spot: Partial<InsertParkingSpot>): Promise<ParkingSpot | undefined>;
  
  // Bookings operations
  getBooking(id: string): Promise<Booking | undefined>;
  getUserBookings(userId: string): Promise<Booking[]>;
  getSpotBookings(spotId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking & { renterId: string }): Promise<Booking>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
  
  // Reviews operations
  createReview(review: InsertReview & { reviewerId: string; spotOwnerId: string }): Promise<Review>;
  getReviewsForOwner(ownerId: string): Promise<Review[]>;
  getReviewsForSpot(spotId: string): Promise<Review[]>;
  getReviewForBooking(bookingId: string): Promise<Review | undefined>;
  canUserReviewBooking(bookingId: string, userId: string): Promise<boolean>;

  // Free trial period operations
  getActiveFreeTrialPeriod(): Promise<FreeTrialPeriod | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Parking spots operations
  async getAllParkingSpots(): Promise<ParkingSpot[]> {
    return await db.select().from(parkingSpots).where(eq(parkingSpots.isActive, true));
  }

  async getParkingSpot(id: string): Promise<ParkingSpot | undefined> {
    const [spot] = await db.select().from(parkingSpots).where(eq(parkingSpots.id, id));
    return spot;
  }

  async getUserParkingSpots(ownerId: string): Promise<ParkingSpot[]> {
    return await db.select().from(parkingSpots).where(eq(parkingSpots.ownerId, ownerId)).orderBy(desc(parkingSpots.createdAt));
  }

  async createParkingSpot(spotData: InsertParkingSpot & { ownerId: string }): Promise<ParkingSpot> {
    const [spot] = await db
      .insert(parkingSpots)
      .values(spotData)
      .returning();
    return spot;
  }

  async updateParkingSpot(id: string, spotData: Partial<InsertParkingSpot>): Promise<ParkingSpot | undefined> {
    const [spot] = await db
      .update(parkingSpots)
      .set({ ...spotData, updatedAt: new Date() })
      .where(eq(parkingSpots.id, id))
      .returning();
    return spot;
  }

  // Bookings operations
  async getBooking(id: string): Promise<Booking | undefined> {
    const [booking] = await db.select().from(bookings).where(eq(bookings.id, id));
    return booking;
  }

  async getUserBookings(userId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.renterId, userId))
      .orderBy(desc(bookings.createdAt));
  }

  async getSpotBookings(spotId: string): Promise<Booking[]> {
    return await db
      .select()
      .from(bookings)
      .where(eq(bookings.spotId, spotId))
      .orderBy(desc(bookings.createdAt));
  }

  async createBooking(bookingData: InsertBooking & { renterId: string }): Promise<Booking> {
    const [booking] = await db
      .insert(bookings)
      .values(bookingData)
      .returning();
    return booking;
  }

  async updateBooking(id: string, bookingData: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [booking] = await db
      .update(bookings)
      .set({ ...bookingData, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return booking;
  }

  // Reviews operations
  async createReview(reviewData: InsertReview & { reviewerId: string; spotOwnerId: string }): Promise<Review> {
    const [review] = await db
      .insert(reviews)
      .values(reviewData)
      .returning();
    return review;
  }

  async getReviewsForOwner(ownerId: string): Promise<Review[]> {
    return await db
      .select()
      .from(reviews)
      .where(eq(reviews.spotOwnerId, ownerId))
      .orderBy(desc(reviews.createdAt));
  }

  async getReviewsForSpot(spotId: string): Promise<Review[]> {
    return await db
      .select({
        id: reviews.id,
        bookingId: reviews.bookingId,
        reviewerId: reviews.reviewerId,
        spotOwnerId: reviews.spotOwnerId,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(bookings, eq(reviews.bookingId, bookings.id))
      .where(eq(bookings.spotId, spotId))
      .orderBy(desc(reviews.createdAt));
  }

  async getReviewForBooking(bookingId: string): Promise<Review | undefined> {
    const [review] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.bookingId, bookingId));
    return review;
  }

  async canUserReviewBooking(bookingId: string, userId: string): Promise<boolean> {
    // Check if booking exists and belongs to user
    const booking = await this.getBooking(bookingId);
    if (!booking || booking.renterId !== userId) {
      return false;
    }

    // Check if booking is paid
    if (booking.paymentStatus !== 'paid') {
      return false;
    }

    // Check if review already exists
    const existingReview = await this.getReviewForBooking(bookingId);
    if (existingReview) {
      return false;
    }

    return true;
  }

  // Free trial period operations
  async getActiveFreeTrialPeriod(): Promise<FreeTrialPeriod | undefined> {
    const [period] = await db
      .select()
      .from(freeTrialPeriod)
      .where(eq(freeTrialPeriod.isActive, true))
      .orderBy(desc(freeTrialPeriod.createdAt))
      .limit(1);
    return period;
  }
}

export const storage = new DatabaseStorage();
