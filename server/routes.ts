import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertParkingSpotSchema, insertBookingSchema, insertReviewSchema } from "@shared/schema";
import { createHash } from "crypto";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import Stripe from "stripe";

// Initialize Stripe - will be used when API keys are provided
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-10-29.clover",
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
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

  // Create Stripe payment intent for parking spot subscription
  app.post('/api/create-parking-spot-payment', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ message: "Stripe is not configured. Please add STRIPE_SECRET_KEY." });
      }

      const { spotData } = req.body;
      const userId = req.user.claims.sub;

      // Validate spot data
      const validatedData = insertParkingSpotSchema.parse(spotData);

      // Create a temporary spot record (will be activated after payment)
      const spot = await storage.createParkingSpot({
        ...validatedData,
        ownerId: userId,
        isActive: false, // Will be activated after payment
      });

      // Create Stripe payment intent (1000 RSD = 1000 * 100 = 100000 dinars in smallest unit)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: 100000, // 1000 RSD in smallest currency unit
        currency: "rsd",
        metadata: {
          spotId: spot.id,
          userId: userId,
          subscriptionType: "monthly",
        },
        description: `ParkIN - Pretplata za parking mesto: ${validatedData.title}`,
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        spotId: spot.id,
      });
    } catch (error: any) {
      console.error("Error creating payment intent:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid spot data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  app.post('/api/parking-spots', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { subscriptionType, ...spotData } = req.body;
      
      console.log('=== POST /api/parking-spots ===');
      console.log('userId:', userId);
      console.log('subscriptionType:', subscriptionType);
      console.log('spotData:', JSON.stringify(spotData).substring(0, 200));
      
      // Import pricing config
      const { getPlanById, calculateExpiryDate } = await import('../shared/pricing.js');
      
      // Get the selected plan
      const plan = getPlanById(subscriptionType || 'monthly');
      console.log('Selected plan:', plan?.id, plan?.name);
      if (!plan) {
        console.error('Invalid subscription plan:', subscriptionType);
        return res.status(400).json({ message: "Invalid subscription plan" });
      }
      
      // Check if user is trying to use trial
      if (plan.isTrial) {
        console.log('User is trying to use trial plan');
        // Get user to check if they've already used trial
        const user = await storage.getUser(userId);
        console.log('User data:', user ? `id=${user.id}, hasUsedFreeTrial=${user.hasUsedFreeTrial}` : 'null');
        if (!user) {
          console.error('User not found:', userId);
          return res.status(404).json({ message: "User not found" });
        }
        
        if (user.hasUsedFreeTrial) {
          console.log('User already used trial');
          return res.status(403).json({ 
            message: "Već ste iskoristili besplatni probni period. Molimo izaberite plaćeni plan.",
            alreadyUsedTrial: true
          });
        }
        
        console.log('Marking user as having used trial');
        // Mark user as having used free trial
        await storage.updateUser(userId, { hasUsedFreeTrial: true });
      } else {
        // For paid plans, payment is currently not enforced (for testing)
        // TODO: When Stripe is configured, redirect to payment flow here
        console.log(`User selected paid plan: ${plan.id} (${plan.price} RSD)`);
      }

      // Validate spot data
      console.log('Validating spot data...');
      const validatedData = insertParkingSpotSchema.parse(spotData);
      console.log('Validation successful');
      
      // Calculate subscription expiry based on selected plan
      const subscriptionExpiresAt = calculateExpiryDate(plan.id);
      console.log('Subscription expires at:', subscriptionExpiresAt.toISOString());

      console.log('Creating parking spot...');
      const spot = await storage.createParkingSpot({
        ...validatedData,
        ownerId: userId,
        subscriptionType: plan.id,
        subscriptionExpiresAt: subscriptionExpiresAt,
      } as any);
      
      console.log('Parking spot created successfully:', spot.id);
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
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
        // In production, don't return these
        debug: {
          digest,
          timestamp,
          authHeader: `WP3-v2 ${authenticityToken} ${timestamp} ${digest}`,
        }
      });
    } catch (error) {
      console.error("Error creating Monri payment:", error);
      res.status(500).json({ message: "Failed to create payment" });
    }
  });

  app.post('/api/payments/monri/callback', async (req, res) => {
    try {
      // Handle Monri payment callback
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

  // Object storage routes - for protected file uploading
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
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

    const userId = req.user.claims.sub;

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

  // Reviews routes
  app.post('/api/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const validatedData = insertReviewSchema.parse(req.body);
      
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
      const userId = req.user.claims.sub;
      const canReview = await storage.canUserReviewBooking(req.params.id, userId);
      res.json({ canReview });
    } catch (error) {
      console.error("Error checking review eligibility:", error);
      res.status(500).json({ message: "Greška pri proveri mogućnosti recenzije" });
    }
  });

  // My spots route
  app.get('/api/parking-spots/my-spots', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const spots = await storage.getUserParkingSpots(userId);
      res.json(spots);
    } catch (error) {
      console.error("Error fetching user parking spots:", error);
      res.status(500).json({ message: "Greška pri učitavanju parking mesta" });
    }
  });

  // Update parking spot
  app.put('/api/parking-spots/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const spot = await storage.getParkingSpot(req.params.id);
      
      if (!spot) {
        return res.status(404).json({ message: "Parking mesto nije pronađeno" });
      }
      
      if (spot.ownerId !== userId) {
        return res.status(403).json({ message: "Nemate dozvolu za brisanje ovog mesta" });
      }
      
      await storage.updateParkingSpot(req.params.id, { isActive: false } as any);
      res.json({ message: "Parking mesto je izbrisano" });
    } catch (error) {
      console.error("Error deleting parking spot:", error);
      res.status(500).json({ message: "Greška pri brisanju parking mesta" });
    }
  });

  // Update user profile
  app.put('/api/users/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { firstName, lastName, phoneNumber } = req.body;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
