import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertParkingSpotSchema, insertBookingSchema, insertReviewSchema } from "@shared/schema";
import { createHash } from "crypto";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

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

  app.post('/api/parking-spots', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Validate request body
      const validatedData = insertParkingSpotSchema.parse(req.body);
      
      const spot = await storage.createParkingSpot({
        ...validatedData,
        ownerId: userId,
      });
      
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

  const httpServer = createServer(app);
  return httpServer;
}
