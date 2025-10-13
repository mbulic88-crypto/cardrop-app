import {
  users,
  parkingSpots,
  bookings,
  type User,
  type UpsertUser,
  type ParkingSpot,
  type InsertParkingSpot,
  type Booking,
  type InsertBooking,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Parking spots operations
  getAllParkingSpots(): Promise<ParkingSpot[]>;
  getParkingSpot(id: string): Promise<ParkingSpot | undefined>;
  createParkingSpot(spot: InsertParkingSpot & { ownerId: string }): Promise<ParkingSpot>;
  updateParkingSpot(id: string, spot: Partial<InsertParkingSpot>): Promise<ParkingSpot | undefined>;
  
  // Bookings operations
  getBooking(id: string): Promise<Booking | undefined>;
  getUserBookings(userId: string): Promise<Booking[]>;
  getSpotBookings(spotId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking & { renterId: string }): Promise<Booking>;
  updateBooking(id: string, booking: Partial<InsertBooking>): Promise<Booking | undefined>;
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

  // Parking spots operations
  async getAllParkingSpots(): Promise<ParkingSpot[]> {
    return await db.select().from(parkingSpots).where(eq(parkingSpots.isActive, true));
  }

  async getParkingSpot(id: string): Promise<ParkingSpot | undefined> {
    const [spot] = await db.select().from(parkingSpots).where(eq(parkingSpots.id, id));
    return spot;
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
}

export const storage = new DatabaseStorage();
