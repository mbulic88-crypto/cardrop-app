import {
  users,
  parkingSpots,
  bookings,
  reviews,
  freeTrialPeriod,
  messages,
  salesListings,
  mapMarkers,
  mapChatMessages,
  mapSafeZones,
  mapWatchAreas,
  type User,
  type UpsertUser,
  type ParkingSpot,
  type InsertParkingSpot,
  type Booking,
  type InsertBooking,
  type Review,
  type InsertReview,
  type FreeTrialPeriod,
  type Message,
  type InsertMessage,
  type SalesListing,
  type InsertSalesListing,
  type MapMarker,
  type InsertMapMarker,
  type MapChatMessage,
  type InsertMapChatMessage,
  type MapSafeZone,
  type InsertMapSafeZone,
  type MapWatchArea,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, or, sql, gt } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByMapNickname(nickname: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, userData: Partial<UpsertUser>): Promise<User | undefined>;
  updateMapHackProfile(userId: string, data: { mapNickname: string; mapAvatarId: number; mapHackTrialStartedAt?: Date }): Promise<User | undefined>;
  resetMapHackProfile(userId: string): Promise<User | undefined>;
  updateMapHackPlan(userId: string, plan: string, expiresAt: Date | null): Promise<User | undefined>;
  
  // Parking spots operations
  getAllParkingSpots(): Promise<ParkingSpot[]>;
  getParkingSpot(id: string): Promise<ParkingSpot | undefined>;
  getUserParkingSpots(ownerId: string): Promise<ParkingSpot[]>;
  createParkingSpot(spot: InsertParkingSpot & { ownerId: string }): Promise<ParkingSpot>;
  updateParkingSpot(id: string, spot: Partial<InsertParkingSpot>): Promise<ParkingSpot | undefined>;
  deleteParkingSpot(id: string): Promise<void>;
  
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
  
  // Messages operations
  createMessage(message: InsertMessage & { senderId: string }): Promise<Message>;
  getUserMessages(userId: string): Promise<Message[]>;
  markMessageAsRead(messageId: string): Promise<void>;
  
  // Sales listings operations
  getAllSalesListings(): Promise<SalesListing[]>;
  getSalesListing(id: string): Promise<SalesListing | undefined>;
  getUserSalesListings(sellerId: string): Promise<SalesListing[]>;
  createSalesListing(listing: InsertSalesListing & { sellerId: string }): Promise<SalesListing>;
  updateSalesListing(id: string, listing: Partial<InsertSalesListing>): Promise<SalesListing | undefined>;
  deleteSalesListing(id: string): Promise<void>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  deleteUser(id: string): Promise<void>;
  getAllParkingSpotsAdmin(): Promise<ParkingSpot[]>;
  deleteParkingSpotAdmin(id: string): Promise<void>;
  toggleParkingSpotActive(id: string): Promise<ParkingSpot | undefined>;
  getAllSalesListingsAdmin(): Promise<SalesListing[]>;
  deleteSalesListingAdmin(id: string): Promise<void>;
  toggleSalesListingActive(id: string): Promise<SalesListing | undefined>;

  // Map Hack NS operations
  getActiveMapMarkers(): Promise<MapMarker[]>;
  createMapMarker(data: InsertMapMarker): Promise<MapMarker>;
  expireMapMarker(id: string): Promise<void>;
  updateMapMarkerLabel(id: string, label: string | null): Promise<MapMarker>;
  getMapChatMessages(limit?: number): Promise<MapChatMessage[]>;
  createMapChatMessage(data: InsertMapChatMessage): Promise<MapChatMessage>;
  getMapSafeZone(userId: string): Promise<MapSafeZone | undefined>;
  upsertMapSafeZone(userId: string, data: { lat: string; lng: string; radiusMeters: number }): Promise<MapSafeZone>;
  getMapWatchArea(userId: string): Promise<MapWatchArea | undefined>;
  upsertMapWatchArea(userId: string, data: { lat: string; lng: string; radiusMeters: number }): Promise<MapWatchArea>;
  deleteMapWatchArea(userId: string): Promise<void>;
  getAllMapWatchAreas(): Promise<MapWatchArea[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByMapNickname(nickname: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.mapNickname, nickname));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          profileImageUrl: userData.profileImageUrl,
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

  async updateMapHackProfile(
    userId: string,
    data: { mapNickname: string; mapAvatarId: number; mapHackTrialStartedAt?: Date; mapProfileLastChangedAt?: Date }
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async resetMapHackProfile(userId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        mapNickname: null,
        mapAvatarId: null,
        mapHackTrialStartedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateMapHackPlan(userId: string, plan: string, expiresAt: Date | null): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ mapHackPlan: plan, mapHackPlanExpiresAt: expiresAt, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Parking spots operations
  async getAllParkingSpots(): Promise<ParkingSpot[]> {
    const tierOrder = sql`CASE 
      WHEN ${parkingSpots.subscriptionType} = 'gold' THEN 0 
      WHEN ${parkingSpots.subscriptionType} = 'silver' THEN 1 
      ELSE 2 
    END`;
    return await db.select().from(parkingSpots)
      .where(eq(parkingSpots.isActive, true))
      .orderBy(tierOrder, desc(parkingSpots.createdAt));
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

  // Messages operations
  async createMessage(messageData: InsertMessage & { senderId: string }): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(messageData)
      .returning();
    return message;
  }

  async getUserMessages(userId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(or(eq(messages.senderId, userId), eq(messages.receiverId, userId)))
      .orderBy(desc(messages.createdAt));
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, messageId));
  }

  // Sales listings operations
  async getAllSalesListings(): Promise<SalesListing[]> {
    const tierOrder = sql`CASE 
      WHEN ${salesListings.subscriptionType} = 'gold' THEN 0 
      WHEN ${salesListings.subscriptionType} = 'silver' THEN 1 
      ELSE 2 
    END`;
    return await db.select().from(salesListings)
      .where(eq(salesListings.isActive, true))
      .orderBy(tierOrder, desc(salesListings.createdAt));
  }

  async getSalesListing(id: string): Promise<SalesListing | undefined> {
    const [listing] = await db.select().from(salesListings).where(eq(salesListings.id, id));
    return listing;
  }

  async getUserSalesListings(sellerId: string): Promise<SalesListing[]> {
    return await db.select().from(salesListings).where(eq(salesListings.sellerId, sellerId)).orderBy(desc(salesListings.createdAt));
  }

  async createSalesListing(listingData: InsertSalesListing & { sellerId: string }): Promise<SalesListing> {
    const [listing] = await db
      .insert(salesListings)
      .values(listingData)
      .returning();
    return listing;
  }

  async updateSalesListing(id: string, listingData: Partial<InsertSalesListing>): Promise<SalesListing | undefined> {
    const [listing] = await db
      .update(salesListings)
      .set({ ...listingData, updatedAt: new Date() })
      .where(eq(salesListings.id, id))
      .returning();
    return listing;
  }

  async deleteSalesListing(id: string): Promise<void> {
    await db.delete(salesListings).where(eq(salesListings.id, id));
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllParkingSpotsAdmin(): Promise<ParkingSpot[]> {
    return await db.select().from(parkingSpots).orderBy(desc(parkingSpots.createdAt));
  }

  async deleteParkingSpot(id: string): Promise<void> {
    await db.delete(parkingSpots).where(eq(parkingSpots.id, id));
  }

  async deleteParkingSpotAdmin(id: string): Promise<void> {
    await db.delete(parkingSpots).where(eq(parkingSpots.id, id));
  }

  async toggleParkingSpotActive(id: string): Promise<ParkingSpot | undefined> {
    const [spot] = await db.select().from(parkingSpots).where(eq(parkingSpots.id, id));
    if (!spot) return undefined;
    const [updated] = await db.update(parkingSpots)
      .set({ isActive: !spot.isActive })
      .where(eq(parkingSpots.id, id))
      .returning();
    return updated;
  }

  async getAllSalesListingsAdmin(): Promise<SalesListing[]> {
    return await db.select().from(salesListings).orderBy(desc(salesListings.createdAt));
  }

  async deleteSalesListingAdmin(id: string): Promise<void> {
    await db.delete(salesListings).where(eq(salesListings.id, id));
  }

  async toggleSalesListingActive(id: string): Promise<SalesListing | undefined> {
    const [listing] = await db.select().from(salesListings).where(eq(salesListings.id, id));
    if (!listing) return undefined;
    const [updated] = await db.update(salesListings)
      .set({ isActive: !listing.isActive })
      .where(eq(salesListings.id, id))
      .returning();
    return updated;
  }

  // Map Hack NS operations
  async getActiveMapMarkers(): Promise<MapMarker[]> {
    const now = new Date();
    return await db
      .select()
      .from(mapMarkers)
      .where(
        or(
          sql`${mapMarkers.expiresAt} IS NULL`,
          gt(mapMarkers.expiresAt, now)
        )
      )
      .orderBy(desc(mapMarkers.createdAt));
  }

  async createMapMarker(data: InsertMapMarker): Promise<MapMarker> {
    const [marker] = await db.insert(mapMarkers).values(data).returning();
    return marker;
  }

  async expireMapMarker(id: string): Promise<void> {
    await db
      .update(mapMarkers)
      .set({ expiresAt: new Date() })
      .where(eq(mapMarkers.id, id));
  }

  async updateMapMarkerLabel(id: string, label: string | null): Promise<MapMarker> {
    const [marker] = await db
      .update(mapMarkers)
      .set({ label })
      .where(eq(mapMarkers.id, id))
      .returning();
    return marker;
  }

  async getMapChatMessages(limit = 60): Promise<MapChatMessage[]> {
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const rows = await db
      .select()
      .from(mapChatMessages)
      .where(gt(mapChatMessages.createdAt, cutoff))
      .orderBy(desc(mapChatMessages.createdAt))
      .limit(limit);
    return rows.reverse();
  }

  async createMapChatMessage(data: InsertMapChatMessage): Promise<MapChatMessage> {
    const [msg] = await db.insert(mapChatMessages).values(data).returning();
    return msg;
  }

  async getMapSafeZone(userId: string): Promise<MapSafeZone | undefined> {
    const [zone] = await db
      .select()
      .from(mapSafeZones)
      .where(eq(mapSafeZones.userId, userId));
    return zone;
  }

  async upsertMapSafeZone(
    userId: string,
    data: { lat: string; lng: string; radiusMeters: number }
  ): Promise<MapSafeZone> {
    const [zone] = await db
      .insert(mapSafeZones)
      .values({ userId, ...data, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: mapSafeZones.userId,
        set: { lat: data.lat, lng: data.lng, radiusMeters: data.radiusMeters, updatedAt: new Date() },
      })
      .returning();
    return zone;
  }

  async getMapWatchArea(userId: string): Promise<MapWatchArea | undefined> {
    const [area] = await db
      .select()
      .from(mapWatchAreas)
      .where(eq(mapWatchAreas.userId, userId));
    return area;
  }

  async upsertMapWatchArea(
    userId: string,
    data: { lat: string; lng: string; radiusMeters: number }
  ): Promise<MapWatchArea> {
    const [area] = await db
      .insert(mapWatchAreas)
      .values({ userId, ...data })
      .onConflictDoUpdate({
        target: mapWatchAreas.userId,
        set: { lat: data.lat, lng: data.lng, radiusMeters: data.radiusMeters },
      })
      .returning();
    return area;
  }

  async deleteMapWatchArea(userId: string): Promise<void> {
    await db.delete(mapWatchAreas).where(eq(mapWatchAreas.userId, userId));
  }

  async getAllMapWatchAreas(): Promise<MapWatchArea[]> {
    return await db.select().from(mapWatchAreas);
  }
}

export const storage = new DatabaseStorage();
