import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertParkingSpotSchema, insertBookingSchema, insertReviewSchema, insertMessageSchema, insertSalesListingSchema } from "@shared/schema";
import { createHash } from "crypto";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { saveSubscription, removeSubscription, sendPushToUser } from "./push";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { getPlanById, type SubscriptionType } from "@shared/pricing";
import { getStripePriceId, type ProductCategory } from "./stripeProducts";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { sanitizeObject } from './sanitize';

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // One-time fix: activate "Garaza u Futogu" Silver spot that was left inactive
  try {
    const fixSpotId = '9ec043a3-7234-4793-bf0a-09a195270f71';
    const fixSpot = await storage.getParkingSpot(fixSpotId);
    if (fixSpot && !fixSpot.isActive) {
      await storage.updateParkingSpot(fixSpotId, {
        isActive: true,
        isPremium: true,
      } as any);
      console.log('Fixed: Activated Garaza u Futogu spot');
    }
  } catch (e) {
    // Spot may not exist in this environment, ignore
  }

  const ADMIN_EMAIL_LIST = ['m.bulic88@gmail.com'];

  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!user.isAdmin && ADMIN_EMAIL_LIST.includes(user.email || '')) {
        await storage.updateUser(user.id, { isAdmin: true } as any);
        user.isAdmin = true;
      }
      const { passwordHash, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Parking spots routes
  app.get('/api/parking-spots', async (req, res) => {
    try {
      const spots = await storage.getAllParkingSpots();
      res.json(spots);
    } catch (error) {
      console.error("Error fetching parking spots:", error);
      res.status(500).json({ message: "Failed to fetch parking spots" });
    }
  });

  // My spots route - MUST be before /:id to avoid matching "my-spots" as an ID
  app.get('/api/parking-spots/my-spots', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const spots = await storage.getUserParkingSpots(userId);
      res.json(spots);
    } catch (error) {
      console.error("Error fetching user parking spots:", error);
      res.status(500).json({ message: "Greška pri učitavanju parking mesta" });
    }
  });

  app.get('/api/parking-spots/:id', async (req, res) => {
    try {
      const spot = await storage.getParkingSpot(req.params.id);
      if (!spot) {
        return res.status(404).json({ message: "Parking spot not found" });
      }
      res.json(spot);
    } catch (error) {
      console.error("Error fetching parking spot:", error);
      res.status(500).json({ message: "Failed to fetch parking spot" });
    }
  });

  // Check if currently in free trial period
  app.get('/api/free-trial-status', async (req, res) => {
    try {
      const freeTrialPeriod = await storage.getActiveFreeTrialPeriod();
      const isInFreeTrial = freeTrialPeriod ? new Date() <= new Date(freeTrialPeriod.endDate) : false;
      
      res.json({
        isActive: isInFreeTrial,
        startDate: freeTrialPeriod?.startDate || null,
        endDate: freeTrialPeriod?.endDate || null,
      });
    } catch (error) {
      console.error("Error checking free trial status:", error);
      res.status(500).json({ message: "Failed to check free trial status" });
    }
  });

  app.get('/api/stripe/publishable-key', async (_req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting Stripe publishable key:", error);
      res.status(500).json({ message: "Stripe is not configured" });
    }
  });

  app.get('/api/stripe/prices', async (_req, res) => {
    try {
      const result = await db.execute(sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency
        FROM stripe.products p
        JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true AND p.metadata->>'app' = 'cardrop'
        ORDER BY pr.unit_amount ASC
      `);
      res.json({ prices: result.rows });
    } catch (error) {
      console.error("Error fetching Stripe prices:", error);
      res.status(500).json({ message: "Failed to fetch prices" });
    }
  });

  app.post('/api/stripe/create-checkout', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId;
      const { tier, spotData } = req.body;

      if (!tier || (tier !== 'silver' && tier !== 'gold')) {
        return res.status(400).json({ message: "Invalid subscription tier" });
      }

      const category = (spotData.category || 'private') as ProductCategory;
      const priceId = getStripePriceId(category, tier);
      if (!priceId) {
        return res.status(404).json({ message: "Price not found for this category and tier" });
      }

      const validatedData = insertParkingSpotSchema.parse(spotData);

      const spot = await storage.createParkingSpot({
        ...validatedData,
        category: category,
        ownerId: userId,
        subscriptionType: tier,
        isPremium: true,
        isActive: false,
      } as any);

      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&spot_id=${spot.id}`,
        cancel_url: `${baseUrl}/checkout/cancel?spot_id=${spot.id}`,
        metadata: {
          spotId: spot.id,
          userId: userId,
          tier: tier,
          category: category,
        },
      });

      await storage.updateParkingSpot(spot.id, {
        stripeSessionId: session.id,
      } as any);

      res.json({ url: session.url, spotId: spot.id });
    } catch (error: any) {
      console.error("Error creating checkout session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid spot data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post('/api/stripe/verify-payment', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { sessionId, spotId } = req.body;
      const userId = req.session.userId;

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed", status: session.payment_status });
      }

      if (session.metadata?.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const tier = session.metadata?.tier as 'silver' | 'gold';
      const { calculateExpiryDate } = await import('../shared/pricing.js');
      const subscriptionExpiresAt = calculateExpiryDate(tier);

      const spot = await storage.updateParkingSpot(spotId, {
        isActive: true,
        subscriptionType: tier,
        isPremium: true,
        subscriptionExpiresAt: subscriptionExpiresAt,
        stripeSessionId: sessionId,
      } as any);

      res.json({ success: true, spot });
    } catch (error: any) {
      console.error("Error verifying payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  app.post('/api/stripe/cancel-spot', isAuthenticated, async (req: any, res) => {
    try {
      const { spotId } = req.body;
      const userId = req.session.userId;

      const spot = await storage.getParkingSpot(spotId);
      if (!spot || spot.ownerId !== userId) {
        return res.status(404).json({ message: "Spot not found" });
      }

      if (!spot.isActive) {
        await storage.updateParkingSpot(spotId, { isActive: false } as any);
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error cancelling spot:", error);
      res.status(500).json({ message: "Failed to cancel" });
    }
  });

  app.post('/api/stripe/create-checkout-existing', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId;
      const { spotId, tier } = req.body;

      if (!tier || (tier !== 'silver' && tier !== 'gold')) {
        return res.status(400).json({ message: "Invalid subscription tier" });
      }

      const spot = await storage.getParkingSpot(spotId);
      if (!spot || spot.ownerId !== userId) {
        return res.status(404).json({ message: "Spot not found" });
      }

      const category = (spot.category || 'private') as ProductCategory;
      const priceId = getStripePriceId(category, tier);
      if (!priceId) {
        return res.status(404).json({ message: "Price not found for this category and tier" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&spot_id=${spot.id}`,
        cancel_url: `${baseUrl}/add-spot?category=${category}`,
        metadata: {
          spotId: spot.id,
          userId: userId,
          tier: tier,
          category: category,
        },
      });

      await storage.updateParkingSpot(spot.id, {
        stripeSessionId: session.id,
      } as any);

      res.json({ url: session.url, spotId: spot.id });
    } catch (error: any) {
      console.error("Error creating checkout for existing spot:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post('/api/stripe/create-sale-checkout', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId;
      const { tier, listingData } = req.body;

      if (!tier || (tier !== 'silver' && tier !== 'gold')) {
        return res.status(400).json({ message: "Invalid subscription tier" });
      }

      const priceId = getStripePriceId('sale', tier);
      if (!priceId) {
        return res.status(404).json({ message: "Price not found for this tier" });
      }

      const validatedData = insertSalesListingSchema.parse(listingData);

      const listing = await storage.createSalesListing({
        ...validatedData,
        sellerId: userId,
        subscriptionType: tier,
        isPremium: true,
        isActive: false,
      } as any);

      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&listing_id=${listing.id}`,
        cancel_url: `${baseUrl}/checkout/cancel?listing_id=${listing.id}`,
        metadata: {
          listingId: listing.id,
          userId: userId,
          tier: tier,
          category: 'sale',
        },
      });

      res.json({ url: session.url, listingId: listing.id });
    } catch (error: any) {
      console.error("Error creating sale checkout session:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid listing data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post('/api/stripe/verify-sale-payment', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { sessionId, listingId } = req.body;
      const userId = req.session.userId;

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed", status: session.payment_status });
      }

      if (session.metadata?.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const tier = session.metadata?.tier as 'silver' | 'gold';
      const { calculateExpiryDate } = await import('../shared/pricing.js');
      const subscriptionExpiresAt = calculateExpiryDate(tier);

      const listing = await storage.updateSalesListing(listingId, {
        isActive: true,
        subscriptionType: tier,
        isPremium: true,
        subscriptionExpiresAt: subscriptionExpiresAt,
      } as any);

      res.json({ success: true, listing });
    } catch (error: any) {
      console.error("Error verifying sale payment:", error);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  const recentSpotCreations = new Map<string, number>();

  app.post('/api/parking-spots', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;

      const dedupeKey = `${userId}-${req.body.title}-${req.body.category || 'private'}`;
      const lastCreation = recentSpotCreations.get(dedupeKey);
      const now = Date.now();
      if (lastCreation && (now - lastCreation) < 10000) {
        return res.status(429).json({ message: "Duplicate request detected. Please wait." });
      }
      recentSpotCreations.set(dedupeKey, now);
      setTimeout(() => recentSpotCreations.delete(dedupeKey), 15000);

      const sanitizedBody = sanitizeObject(req.body);
      const { subscriptionType, category, isPremium, ...spotData } = sanitizedBody;
      
      const { getPlanById, calculateExpiryDate } = await import('../shared/pricing.js');
      
      const planId = subscriptionType || 'standard';
      const plan = getPlanById(planId);
      if (!plan) {
        console.error('Invalid subscription plan:', subscriptionType);
        return res.status(400).json({ message: "Invalid subscription plan" });
      }

      if (spotData.numberOfSpots) {
        spotData.numberOfSpots = parseInt(spotData.numberOfSpots) || undefined;
      }
      const validatedData = insertParkingSpotSchema.parse(spotData);
      
      const subscriptionExpiresAt = calculateExpiryDate(plan.id);

      const isPremiumPlan = plan.tier === 'gold' || plan.tier === 'silver';
      const spot = await storage.createParkingSpot({
        ...validatedData,
        category: category || 'private',
        ownerId: userId,
        subscriptionType: plan.id,
        subscriptionExpiresAt: isPremiumPlan ? null : subscriptionExpiresAt,
        isPremium: isPremiumPlan,
        isActive: !isPremiumPlan,
      } as any);
      
      res.status(201).json(spot);
    } catch (error: any) {
      console.error("Error creating parking spot:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create parking spot" });
    }
  });

  // User routes
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Bookings routes
  app.get('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const bookings = await storage.getUserBookings(userId);
      res.json(bookings);
    } catch (error) {
      console.error("Error fetching bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.get('/api/bookings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      console.error("Error fetching booking:", error);
      res.status(500).json({ message: "Failed to fetch booking" });
    }
  });

  app.post('/api/bookings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      
      // Validate request body
      const validatedData = insertBookingSchema.parse(req.body);
      
      // Check for conflicting bookings
      const existingBookings = await storage.getSpotBookings(validatedData.spotId);
      const hasConflict = existingBookings.some((booking) => {
        if (booking.status === 'cancelled') return false;
        
        const newStart = new Date(validatedData.startTime);
        const newEnd = new Date(validatedData.endTime);
        const existingStart = new Date(booking.startTime);
        const existingEnd = new Date(booking.endTime);
        
        return (
          (newStart >= existingStart && newStart < existingEnd) ||
          (newEnd > existingStart && newEnd <= existingEnd) ||
          (newStart <= existingStart && newEnd >= existingEnd)
        );
      });
      
      if (hasConflict) {
        return res.status(400).json({ message: "Time slot is already booked" });
      }
      
      const booking = await storage.createBooking({
        ...validatedData,
        renterId: userId,
      });
      
      res.status(201).json(booking);
    } catch (error: any) {
      console.error("Error creating booking:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid input data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Monri payment routes
  app.post('/api/payments/monri/create', isAuthenticated, async (req: any, res) => {
    try {
      const { bookingId, amount, currency } = req.body;
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // In production, these would come from environment variables
      const merchantKey = process.env.MONRI_MERCHANT_KEY || 'test_merchant_key';
      const authenticityToken = process.env.MONRI_AUTHENTICITY_TOKEN || 'test_authenticity_token';
      const timestamp = Date.now();
      const fullpath = '/v2/payment/new';
      
      const orderNumber = `PARK-${bookingId}-${Date.now()}`;
      
      const body = {
        transaction_type: "purchase",
        amount: Math.round(parseFloat(amount) * 100), // Convert to cents
        currency: currency || "RSD",
        order_number: orderNumber,
        order_info: `ParkShare Booking ${bookingId}`,
        language: "sr",
        ch_full_name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown',
        ch_address: "N/A",
        ch_city: "Novi Sad",
        ch_zip: "21000",
        ch_country: "RS",
        ch_phone: user.phoneNumber || "000000000",
        ch_email: user.email || "user@parkshare.rs",
        supported_payment_methods: ["card"]
      };
      
      // Generate digest: SHA512(merchantKey + timestamp + authenticityToken + fullpath + body)
      const message = merchantKey + timestamp + authenticityToken + fullpath + JSON.stringify(body);
      const digest = createHash('sha512').update(message).digest('hex');
      
      // In production, make actual API call to Monri
      // For now, return mock response
      const mockResponse = {
        status: "approved",
        id: `monri_${Date.now()}`,
        client_secret: `secret_${Date.now()}`,
        order_number: orderNumber,
        payment_url: `https://ipgtest.monri.com/payment/${orderNumber}`,
      };
      
      res.json({
        success: true,
        payment: mockResponse,
      });
    } catch (error) {
      console.error("Error creating Monri payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.post('/api/payments/monri/callback', async (req, res) => {
    try {
      // TODO: Add proper Monri signature verification in production
      // Verify the callback authenticity using Monri's signature mechanism
      const { order_number, status, transaction_id } = req.body;
      
      // Extract booking ID from order number
      const bookingId = order_number.split('-')[1];
      
      if (status === 'approved') {
        await storage.updateBooking(bookingId, {
          status: 'confirmed',
          paymentStatus: 'paid',
          monriOrderNumber: order_number,
          monriTransactionId: transaction_id,
        });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error handling Monri callback:", error);
      res.status(500).json({ message: "Failed to process callback" });
    }
  });

  // Object storage routes - public images accessible without auth, private require auth
  app.get("/objects/:objectPath(*)", async (req: any, res) => {
    const userId = req.session?.userId;
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      const canAccess = await objectStorageService.canAccessObjectEntity({
        objectFile,
        userId: userId,
      });
      if (!canAccess) {
        return res.sendStatus(401);
      }
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  app.put("/api/parking-spots/:id/images", isAuthenticated, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.session.userId;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public", // Parking spot images are public
        },
      );

      // Update parking spot with new image
      const spot = await storage.getParkingSpot(req.params.id);
      if (!spot) {
        return res.status(404).json({ error: "Parking spot not found" });
      }

      if (spot.ownerId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updatedImages = [...spot.imageUrls, objectPath];
      await storage.updateParkingSpot(req.params.id, {
        imageUrls: updatedImages,
      });

      res.status(200).json({
        objectPath: objectPath,
        imageUrls: updatedImages,
      });
    } catch (error) {
      console.error("Error setting parking spot image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Delete individual image from parking spot
  app.delete("/api/parking-spots/:id/images", isAuthenticated, async (req: any, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }

    const userId = req.session.userId;

    try {
      const spot = await storage.getParkingSpot(req.params.id);
      if (!spot) {
        return res.status(404).json({ error: "Parking spot not found" });
      }

      if (spot.ownerId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updatedImages = spot.imageUrls.filter((url: string) => url !== imageUrl);
      await storage.updateParkingSpot(req.params.id, {
        imageUrls: updatedImages,
      });

      res.status(200).json({
        imageUrls: updatedImages,
      });
    } catch (error) {
      console.error("Error deleting parking spot image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reviews routes
  app.post('/api/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const sanitizedBody = sanitizeObject(req.body);
      
      const validatedData = insertReviewSchema.parse(sanitizedBody);
      
      // Check if user can review this booking
      const canReview = await storage.canUserReviewBooking(validatedData.bookingId, userId);
      if (!canReview) {
        return res.status(403).json({ 
          message: "Ne možete ostaviti recenziju. Booking mora biti plaćen i ne smete već imati recenziju." 
        });
      }

      // Get booking to find spot owner
      const booking = await storage.getBooking(validatedData.bookingId);
      if (!booking) {
        return res.status(404).json({ message: "Booking nije pronađen" });
      }

      const spot = await storage.getParkingSpot(booking.spotId);
      if (!spot) {
        return res.status(404).json({ message: "Parking mesto nije pronađeno" });
      }

      const review = await storage.createReview({
        ...validatedData,
        reviewerId: userId,
        spotOwnerId: spot.ownerId,
      });
      
      res.status(201).json(review);
    } catch (error: any) {
      console.error("Error creating review:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Nevalidni podaci", errors: error.errors });
      }
      // Handle unique constraint violation (duplicate review)
      if (error.code === '23505' && error.constraint === 'reviews_booking_id_unique') {
        return res.status(409).json({ message: "Recenzija za ovaj booking već postoji" });
      }
      res.status(500).json({ message: "Greška pri kreiranju recenzije" });
    }
  });

  app.get('/api/reviews/owner/:ownerId', async (req, res) => {
    try {
      const reviews = await storage.getReviewsForOwner(req.params.ownerId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      res.status(500).json({ message: "Greška pri učitavanju recenzija" });
    }
  });

  app.get('/api/reviews/spot/:spotId', async (req, res) => {
    try {
      const reviews = await storage.getReviewsForSpot(req.params.spotId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching reviews for spot:", error);
      res.status(500).json({ message: "Greška pri učitavanju recenzija za parking mesto" });
    }
  });

  app.get('/api/reviews/booking/:bookingId', isAuthenticated, async (req: any, res) => {
    try {
      const review = await storage.getReviewForBooking(req.params.bookingId);
      res.json(review || null);
    } catch (error) {
      console.error("Error fetching review:", error);
      res.status(500).json({ message: "Greška pri učitavanju recenzije" });
    }
  });

  app.get('/api/bookings/:id/can-review', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const canReview = await storage.canUserReviewBooking(req.params.id, userId);
      res.json({ canReview });
    } catch (error) {
      console.error("Error checking review eligibility:", error);
      res.status(500).json({ message: "Greška pri proveri mogućnosti recenzije" });
    }
  });

  // Update parking spot
  app.put('/api/parking-spots/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const spot = await storage.getParkingSpot(req.params.id);
      
      if (!spot) {
        return res.status(404).json({ message: "Parking mesto nije pronađeno" });
      }
      
      if (spot.ownerId !== userId) {
        return res.status(403).json({ message: "Nemate dozvolu za izmenu ovog mesta" });
      }
      
      const validatedData = insertParkingSpotSchema.omit({ subscriptionType: true } as any).parse(req.body);
      const updated = await storage.updateParkingSpot(req.params.id, validatedData);
      
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating parking spot:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Nevalidni podaci", errors: error.errors });
      }
      res.status(500).json({ message: "Greška pri ažuriranju parking mesta" });
    }
  });

  // Delete parking spot
  app.delete('/api/parking-spots/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const spot = await storage.getParkingSpot(req.params.id);
      
      if (!spot) {
        return res.status(404).json({ message: "Parking mesto nije pronađeno" });
      }
      
      if (spot.ownerId !== userId) {
        return res.status(403).json({ message: "Nemate dozvolu za brisanje ovog mesta" });
      }
      
      await storage.deleteParkingSpot(req.params.id);
      res.json({ message: "Parking mesto je izbrisano" });
    } catch (error) {
      console.error("Error deleting parking spot:", error);
      res.status(500).json({ message: "Greška pri brisanju parking mesta" });
    }
  });

  // Update user profile
  app.put('/api/users/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const sanitizedBody = sanitizeObject(req.body);
      const { firstName, lastName, phoneNumber } = sanitizedBody;
      
      const updated = await storage.updateUser(userId, { 
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        phoneNumber: phoneNumber || undefined,
      });
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Greška pri ažuriranju profila" });
    }
  });

  // Push notification subscription routes
  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { subscription } = req.body;
      
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: "Invalid subscription data" });
      }

      const success = await saveSubscription(userId, subscription);
      if (success) {
        res.json({ message: "Subscription saved successfully" });
      } else {
        res.status(500).json({ message: "Failed to save subscription" });
      }
    } catch (error) {
      console.error("Error saving push subscription:", error);
      res.status(500).json({ message: "Failed to save subscription" });
    }
  });

  app.post('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { endpoint } = req.body;
      
      const success = await removeSubscription(userId, endpoint);
      if (success) {
        res.json({ message: "Subscription removed successfully" });
      } else {
        res.status(500).json({ message: "Failed to remove subscription" });
      }
    } catch (error) {
      console.error("Error removing push subscription:", error);
      res.status(500).json({ message: "Failed to remove subscription" });
    }
  });

  // Messages routes
  app.post('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const sanitizedBody = sanitizeObject(req.body);
      const validatedData = insertMessageSchema.parse(sanitizedBody);
      
      const message = await storage.createMessage({
        ...validatedData,
        senderId: userId,
      });

      // Get sender info for notification
      const sender = await storage.getUser(userId);
      const senderName = sender?.firstName || sender?.email || 'Korisnik';

      // Get spot info if available
      let spotTitle = 'parking mesto';
      if (validatedData.spotId) {
        const spot = await storage.getParkingSpot(validatedData.spotId);
        if (spot) spotTitle = spot.title;
      }

      // Send push notification to receiver
      await sendPushToUser(validatedData.receiverId, {
        title: 'Nova poruka - CarDrop',
        body: `${senderName} vam je poslao poruku u vezi: ${spotTitle}`,
        url: '/dashboard?tab=messages',
        tag: 'new-message',
      });

      res.status(201).json(message);
    } catch (error: any) {
      console.error("Error sending message:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Nevalidni podaci", errors: error.errors });
      }
      res.status(500).json({ message: "Greška pri slanju poruke" });
    }
  });

  app.get('/api/messages', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const msgs = await storage.getUserMessages(userId);
      const userCache: Record<string, any> = {};
      const spotCache: Record<string, any> = {};
      const enriched = await Promise.all(msgs.map(async (msg) => {
        if (!userCache[msg.senderId]) {
          userCache[msg.senderId] = await storage.getUser(msg.senderId);
        }
        if (!userCache[msg.receiverId]) {
          userCache[msg.receiverId] = await storage.getUser(msg.receiverId);
        }
        let spotTitle = null;
        if (msg.spotId) {
          if (!spotCache[msg.spotId]) {
            spotCache[msg.spotId] = await storage.getParkingSpot(msg.spotId);
          }
          spotTitle = spotCache[msg.spotId]?.title || null;
        }
        const sender = userCache[msg.senderId];
        const receiver = userCache[msg.receiverId];
        return {
          ...msg,
          senderName: sender ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim() || sender.email : 'Korisnik',
          receiverName: receiver ? `${receiver.firstName || ''} ${receiver.lastName || ''}`.trim() || receiver.email : 'Korisnik',
          spotTitle,
        };
      }));
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Greška pri učitavanju poruka" });
    }
  });

  app.put('/api/messages/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      await storage.markMessageAsRead(req.params.id);
      res.json({ message: "Poruka označena kao pročitana" });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Greška" });
    }
  });

  // Admin middleware
  const ADMIN_EMAILS = ['m.bulic88@gmail.com'];

  const isAdmin = async (req: any, res: any, next: any) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const hasAdminAccess = user.isAdmin || ADMIN_EMAILS.includes(user.email || '');
    if (!hasAdminAccess) return res.status(403).json({ message: "Forbidden - Admin only" });
    if (!user.isAdmin && hasAdminAccess) {
      await storage.updateUser(user.id, { isAdmin: true } as any);
    }
    next();
  };

  // Admin routes
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ message: "User deleted" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get('/api/admin/parking-spots', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const spots = await storage.getAllParkingSpotsAdmin();
      res.json(spots);
    } catch (error) {
      console.error("Error fetching all parking spots:", error);
      res.status(500).json({ message: "Failed to fetch parking spots" });
    }
  });

  app.delete('/api/admin/parking-spots/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteParkingSpotAdmin(req.params.id);
      res.json({ message: "Parking spot deleted" });
    } catch (error) {
      console.error("Error deleting parking spot:", error);
      res.status(500).json({ message: "Failed to delete parking spot" });
    }
  });

  app.patch('/api/admin/parking-spots/:id/toggle-active', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const spot = await storage.toggleParkingSpotActive(req.params.id);
      if (!spot) {
        return res.status(404).json({ message: "Parking spot not found" });
      }
      res.json(spot);
    } catch (error) {
      console.error("Error toggling parking spot:", error);
      res.status(500).json({ message: "Failed to toggle parking spot" });
    }
  });

  app.patch('/api/admin/parking-spots/:id/update', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { isActive, isPremium, subscriptionType, latitude, longitude } = req.body;
      const updates: any = {};
      if (isActive !== undefined) updates.isActive = isActive;
      if (isPremium !== undefined) updates.isPremium = isPremium;
      if (subscriptionType !== undefined) updates.subscriptionType = subscriptionType;
      if (latitude !== undefined) updates.latitude = String(latitude);
      if (longitude !== undefined) updates.longitude = String(longitude);
      const spot = await storage.updateParkingSpot(req.params.id, updates);
      if (!spot) {
        return res.status(404).json({ message: "Parking spot not found" });
      }
      res.json(spot);
    } catch (error) {
      console.error("Error updating parking spot:", error);
      res.status(500).json({ message: "Failed to update parking spot" });
    }
  });

  app.get('/api/admin/sales-listings', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const listings = await storage.getAllSalesListingsAdmin();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching all sales listings:", error);
      res.status(500).json({ message: "Failed to fetch sales listings" });
    }
  });

  app.delete('/api/admin/sales-listings/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteSalesListingAdmin(req.params.id);
      res.json({ message: "Sales listing deleted" });
    } catch (error) {
      console.error("Error deleting sales listing:", error);
      res.status(500).json({ message: "Failed to delete sales listing" });
    }
  });

  app.patch('/api/admin/sales-listings/:id/toggle-active', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const listing = await storage.toggleSalesListingActive(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Sales listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error toggling sales listing:", error);
      res.status(500).json({ message: "Failed to toggle sales listing" });
    }
  });

  // Sales listings routes
  app.get('/api/sales-listings', async (req, res) => {
    try {
      const listings = await storage.getAllSalesListings();
      res.json(listings);
    } catch (error) {
      console.error("Error fetching sales listings:", error);
      res.status(500).json({ message: "Failed to fetch sales listings" });
    }
  });

  app.get('/api/sales-listings/my-listings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const listings = await storage.getUserSalesListings(userId);
      res.json(listings);
    } catch (error) {
      console.error("Error fetching user sales listings:", error);
      res.status(500).json({ message: "Failed to fetch your sales listings" });
    }
  });

  app.get('/api/sales-listings/:id', async (req, res) => {
    try {
      const listing = await storage.getSalesListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Sales listing not found" });
      }
      res.json(listing);
    } catch (error) {
      console.error("Error fetching sales listing:", error);
      res.status(500).json({ message: "Failed to fetch sales listing" });
    }
  });

  app.post('/api/sales-listings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const sanitizedBody = sanitizeObject(req.body);
      const { subscriptionType: subType, ...listingData } = sanitizedBody;
      const validatedData = insertSalesListingSchema.parse(listingData);
      
      const { getPlanById, calculateExpiryDate } = await import('../shared/pricing.js');
      const plan = getPlanById(subType || 'standard');
      const subscriptionExpiresAt = plan ? calculateExpiryDate(plan.id) : calculateExpiryDate('standard');
      
      const listing = await storage.createSalesListing({
        ...validatedData,
        sellerId: userId,
        subscriptionType: plan?.id || 'standard',
        subscriptionExpiresAt,
        isPremium: plan ? (plan.tier === 'gold' || plan.tier === 'silver') : false,
      } as any);
      res.status(201).json(listing);
    } catch (error: any) {
      console.error("Error creating sales listing:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create sales listing" });
    }
  });

  app.put("/api/sales-listings/:id/images", isAuthenticated, async (req: any, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    const userId = req.session.userId;

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = await objectStorageService.trySetObjectEntityAclPolicy(
        req.body.imageURL,
        {
          owner: userId,
          visibility: "public",
        },
      );

      const listing = await storage.getSalesListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ error: "Sales listing not found" });
      }

      if (listing.sellerId !== userId) {
        return res.status(403).json({ error: "Not authorized" });
      }

      const updatedImages = [...(listing.imageUrls || []), objectPath];
      await storage.updateSalesListing(req.params.id, {
        imageUrls: updatedImages,
      });

      res.status(200).json({
        objectPath: objectPath,
        imageUrls: updatedImages,
      });
    } catch (error) {
      console.error("Error setting sales listing image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch('/api/sales-listings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const listing = await storage.getSalesListing(req.params.id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.sellerId !== userId) return res.status(403).json({ message: "Not authorized" });
      const sanitizedBody = sanitizeObject(req.body);
      const updated = await storage.updateSalesListing(req.params.id, sanitizedBody);
      res.json(updated);
    } catch (error) {
      console.error("Error updating sales listing:", error);
      res.status(500).json({ message: "Failed to update sales listing" });
    }
  });

  app.delete('/api/sales-listings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const listing = await storage.getSalesListing(req.params.id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.sellerId !== userId) return res.status(403).json({ message: "Not authorized" });
      await storage.deleteSalesListing(req.params.id);
      res.json({ message: "Listing deleted" });
    } catch (error) {
      console.error("Error deleting sales listing:", error);
      res.status(500).json({ message: "Failed to delete sales listing" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
