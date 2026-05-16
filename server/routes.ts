import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertParkingSpotSchema, parkingSpotEditSchema, insertBookingSchema, bookingCreateSchema, insertReviewSchema, insertMessageSchema, insertSalesListingSchema } from "@shared/schema";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { saveSubscription, removeSubscription, sendPushToUser } from "./push";
import Stripe from "stripe";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { getPlanById, type SubscriptionType } from "@shared/pricing";
import { getStripePriceId, getMapHackPriceId, getMapHackRecurringPriceId, type ProductCategory } from "./stripeProducts";
import { db } from "./db";
import { sql, eq, or, gt, desc } from "drizzle-orm";
import { mapMarkers as mapMarkersTable, users as usersTable, pushSubscriptions as pushSubscriptionsTable } from "@shared/schema";
import { sanitizeObject } from './sanitize';
import { sendMapHackPurchaseEmail } from './email';

function haversineMetersServer(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

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

  // Map Hack NS - save nickname + avatar
  app.patch('/api/map-hack/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { mapNickname: nickInput, mapAvatarId: avatarIdInput, nickname: nickFallback, avatarId: avatarIdFallback } = req.body;
      const nickname: unknown = nickInput ?? nickFallback;
      const avatarId: unknown = avatarIdInput ?? avatarIdFallback;

      if (!nickname || typeof nickname !== 'string') {
        return res.status(400).json({ message: "Nickname je obavezan" });
      }
      const trimmed = nickname.trim();
      if (trimmed.length < 3 || trimmed.length > 20) {
        return res.status(400).json({ message: "Nadimak mora imati između 3 i 20 znakova" });
      }
      if (!/^[a-zA-Z0-9_\-]+$/.test(trimmed)) {
        return res.status(400).json({ message: "Nadimak sme da sadrži samo slova, brojeve, crtice i donju crtu" });
      }
      if (typeof avatarId !== 'number' || avatarId < 1 || avatarId > 10) {
        return res.status(400).json({ message: "Izaberi avatar (1–10)" });
      }

      // Handle privacy acceptance flag embedded in profile save
      const acceptedPrivacy: boolean = req.body.acceptedPrivacy === true;

      const existing = await storage.getUserByMapNickname(trimmed);
      if (existing && existing.id !== userId) {
        return res.status(409).json({ message: "Ovaj nadimak je već zauzet" });
      }

      const currentUser = await storage.getUser(userId);

      // Weekly cooldown for profile changes (skip for admins and first-time onboarding)
      const isAdminUser = currentUser?.isAdmin || ADMIN_EMAIL_LIST.includes(currentUser?.email || '');
      const isFirstTimeOnboarding = !currentUser?.mapNickname;
      if (!isAdminUser && !isFirstTimeOnboarding && currentUser?.mapProfileLastChangedAt) {
        const lastChanged = new Date(currentUser.mapProfileLastChangedAt);
        const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
        const nextAllowed = new Date(lastChanged.getTime() + oneWeekMs);
        if (new Date() < nextAllowed) {
          return res.status(429).json({ error: "cooldown", nextAllowed: nextAllowed.toISOString() });
        }
      }

      const now = new Date();
      const profileData: { mapNickname: string; mapAvatarId: number; mapHackTrialStartedAt?: Date; mapProfileLastChangedAt?: Date } = {
        mapNickname: trimmed,
        mapAvatarId: avatarId,
        mapProfileLastChangedAt: now,
      };
      if (currentUser && !currentUser.mapHackTrialStartedAt) {
        profileData.mapHackTrialStartedAt = new Date();
      }
      const updated = await storage.updateMapHackProfile(userId, profileData);
      if (!updated) return res.status(404).json({ message: "Korisnik nije pronađen" });
      // If privacy was accepted in this request, record it
      if (acceptedPrivacy && !currentUser?.mapPrivacyAcceptedAt) {
        await storage.acceptMapHackPrivacy(userId);
      }
      const { passwordHash, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Error saving map hack profile:", error);
      res.status(500).json({ message: "Greška pri čuvanju profila" });
    }
  });

  // Map Hack NS - reset profile (admin only, for testing)
  app.post('/api/map-hack/reset-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Korisnik nije pronađen" });

      const hasAccess = user.isAdmin || ADMIN_EMAIL_LIST.includes(user.email || '');
      if (!hasAccess) {
        return res.status(403).json({ message: "Nemate dozvolu za ovu akciju" });
      }

      const updated = await storage.resetMapHackProfile(userId);
      if (!updated) return res.status(404).json({ message: "Korisnik nije pronađen" });
      const { passwordHash, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Error resetting map hack profile:", error);
      res.status(500).json({ message: "Greška pri resetovanju profila" });
    }
  });

  // Map Hack NS - accept privacy policy
  app.post('/api/map-hack/accept-privacy', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const updated = await storage.acceptMapHackPrivacy(userId);
      if (!updated) return res.status(404).json({ message: "Korisnik nije pronađen" });
      const { passwordHash, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Error accepting privacy:", error);
      res.status(500).json({ message: "Greška pri prihvatanju politike privatnosti" });
    }
  });

  // Map Hack NS - toggle notifications
  app.patch('/api/map-hack/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ message: "enabled mora biti boolean" });
      }
      const updated = await storage.updateUser(userId, { mapNotificationsEnabled: enabled });
      if (!updated) return res.status(404).json({ message: "Korisnik nije pronađen" });
      res.json({ mapNotificationsEnabled: updated.mapNotificationsEnabled });
    } catch (error) {
      console.error("Error toggling notifications:", error);
      res.status(500).json({ message: "Greška pri promeni notifikacija" });
    }
  });

  // Map Hack NS - get subscription status
  app.get('/api/map-hack/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "Korisnik nije pronađen" });

      if (user.isAdmin) {
        return res.json({
          phase: "active",
          trialStartedAt: null,
          trialExpiresAt: null,
          daysLeft: 9999,
          plan: "admin",
          planExpiresAt: null,
        });
      }

      // Free plan — always active, no expiry
      if (user.mapHackPlan === 'free') {
        return res.json({
          phase: "active",
          trialStartedAt: null,
          trialExpiresAt: null,
          daysLeft: 9999,
          plan: "free",
          planExpiresAt: null,
        });
      }

      const now = new Date();
      const TRIAL_DAYS = 30;

      // If trial hasn't started yet (should not happen normally since it starts on profile save)
      if (!user.mapHackTrialStartedAt) {
        return res.json({
          phase: "trial",
          trialStartedAt: null,
          trialExpiresAt: null,
          daysLeft: TRIAL_DAYS,
          plan: null,
          planExpiresAt: null,
        });
      }

      const trialStartedAt = new Date(user.mapHackTrialStartedAt);
      const trialExpiresAt = new Date(trialStartedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

      // Check paid plan first
      if (user.mapHackPlan && user.mapHackPlanExpiresAt) {
        const planExpiresAt = new Date(user.mapHackPlanExpiresAt);
        if (now < planExpiresAt) {
          const msLeft = planExpiresAt.getTime() - now.getTime();
          const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
          return res.json({
            phase: "active",
            trialStartedAt: trialStartedAt.toISOString(),
            trialExpiresAt: trialExpiresAt.toISOString(),
            daysLeft,
            plan: user.mapHackPlan,
            planExpiresAt: planExpiresAt.toISOString(),
          });
        } else {
          return res.json({
            phase: "plan_expired",
            trialStartedAt: trialStartedAt.toISOString(),
            trialExpiresAt: trialExpiresAt.toISOString(),
            daysLeft: 0,
            plan: user.mapHackPlan,
            planExpiresAt: new Date(user.mapHackPlanExpiresAt).toISOString(),
          });
        }
      }

      // No paid plan — check trial
      if (now < trialExpiresAt) {
        const msLeft = trialExpiresAt.getTime() - now.getTime();
        const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000));
        return res.json({
          phase: "trial",
          trialStartedAt: trialStartedAt.toISOString(),
          trialExpiresAt: trialExpiresAt.toISOString(),
          daysLeft,
          plan: null,
          planExpiresAt: null,
        });
      }

      // Trial expired, no plan
      return res.json({
        phase: "trial_expired",
        trialStartedAt: trialStartedAt.toISOString(),
        trialExpiresAt: trialExpiresAt.toISOString(),
        daysLeft: 0,
        plan: null,
        planExpiresAt: null,
      });
    } catch (error) {
      console.error("Error fetching map hack status:", error);
      res.status(500).json({ message: "Greška pri proveri statusa" });
    }
  });

  // Map Hack NS - set plan
  app.post('/api/map-hack/plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const { plan } = req.body;
      const validPlans = ['free', 'premium', 'day_pass', 'godisnji_premium'];
      if (!plan || !validPlans.includes(plan)) {
        return res.status(400).json({ message: "Nevalidan plan" });
      }
      const currentUser = await storage.getUser(userId);
      if (!currentUser?.mapPrivacyAcceptedAt) {
        return res.status(403).json({ message: "Morate prihvatiti Politiku privatnosti pre ulaska na mapu" });
      }
      if (plan !== 'free') {
        return res.status(400).json({ message: "Plaćanje za ovaj plan uskoro — info@cardrop.app" });
      }
      const updated = await storage.updateMapHackPlan(userId, 'free', null);
      if (!updated) return res.status(404).json({ message: "Korisnik nije pronađen" });
      const { passwordHash, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error) {
      console.error("Error setting map hack plan:", error);
      res.status(500).json({ message: "Greška pri postavljanju plana" });
    }
  });

  // ─── Map Hack NS — Stripe Checkout for plans ─────────────────────────────

  app.post('/api/map-hack/create-checkout', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId;
      const { plan } = req.body;

      const validPlans: Record<string, { name: string; amount: number; description: string }> = {
        premium: { name: "CarDrop Map Hack NS — Premium", amount: 39000, description: "Premium plan — 30 dana" },
        day_pass: { name: "CarDrop Map Hack NS — Day Pass", amount: 12000, description: "Day Pass — 24 sata" },
        godisnji_premium: { name: "CarDrop Map Hack NS — Godišnji", amount: 350000, description: "Godišnji Premium — 365 dana" },
      };

      if (!plan || !validPlans[plan]) {
        return res.status(400).json({ message: "Nevalidan plan" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser?.mapPrivacyAcceptedAt) {
        return res.status(403).json({ message: "Morate prihvatiti Politiku privatnosti pre kupovine plana" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const isSubscriptionPlan = plan === 'premium' || plan === 'godisnji_premium';

      let priceId: string | undefined;
      if (isSubscriptionPlan) {
        priceId = getMapHackRecurringPriceId(plan);
      } else {
        priceId = getMapHackPriceId(plan);
      }

      if (!priceId) {
        return res.status(503).json({ message: "Plan trenutno nije dostupan za plaćanje. Pokušaj ponovo za nekoliko minuta ili kontaktiraj info@cardrop.app" });
      }

      let sessionParams: Stripe.Checkout.SessionCreateParams;

      if (isSubscriptionPlan) {
        // Find or create Stripe customer for this user
        let stripeCustomerId = currentUser.stripeCustomerId ?? undefined;
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: currentUser.email ?? undefined,
            name: currentUser.mapNickname ?? (`${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() || undefined),
            metadata: { userId },
          });
          stripeCustomerId = customer.id;
          await storage.updateMapHackSubscription(userId, { stripeCustomerId });
        }

        sessionParams = {
          customer: stripeCustomerId,
          line_items: [{ price: priceId, quantity: 1 }],
          mode: 'subscription',
          subscription_data: {
            metadata: { userId, plan },
          },
          success_url: `${baseUrl}/map-hack?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/map-hack/subscribe`,
          metadata: { userId, plan },
        };
      } else {
        sessionParams = {
          line_items: [{ price: priceId, quantity: 1 }],
          mode: 'payment',
          success_url: `${baseUrl}/map-hack?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/map-hack/subscribe`,
          metadata: { userId, plan },
        };
      }

      const session = await stripe.checkout.sessions.create(sessionParams);

      res.json({ url: session.url });
    } catch (error: unknown) {
      console.error("Error creating map hack checkout:", error);
      const msg = error instanceof Error ? error.message : "Greška pri kreiranju sesije";
      res.status(500).json({ message: msg });
    }
  });

  app.post('/api/map-hack/verify-plan-payment', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId;
      const { sessionId } = req.body;

      if (!sessionId) {
        return res.status(400).json({ message: "Nedostaju parametri" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser?.mapPrivacyAcceptedAt) {
        return res.status(403).json({ message: "Morate prihvatiti Politiku privatnosti pre aktivacije plana" });
      }

      const alreadyConsumed = await storage.isStripeSessionConsumed(sessionId);
      if (alreadyConsumed) {
        return res.status(409).json({ message: "Sesija je već iskorišćena" });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Plaćanje nije završeno" });
      }

      if (session.metadata?.userId !== String(userId)) {
        return res.status(403).json({ message: "Neovlašćen pristup" });
      }

      const verifiedPlan = session.metadata?.plan;
      const validPlans = ['day_pass', 'premium', 'godisnji_premium'];
      if (!verifiedPlan || !validPlans.includes(verifiedPlan)) {
        return res.status(400).json({ message: "Nevalidan plan u sesiji" });
      }

      const now = new Date();
      let expiresAt: Date;
      if (verifiedPlan === 'day_pass') {
        expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      } else if (verifiedPlan === 'premium') {
        expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else {
        expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      }

      const updated = await storage.activateMapHackPlanWithSession(userId, verifiedPlan, expiresAt, sessionId);
      if (!updated) return res.status(404).json({ message: "Korisnik nije pronađen" });

      // For subscription plans, save the subscription ID
      if ((verifiedPlan === 'premium' || verifiedPlan === 'godisnji_premium') && session.subscription) {
        const subscriptionId = typeof session.subscription === 'string'
          ? session.subscription
          : session.subscription.id;
        await storage.updateMapHackSubscription(userId, { stripeSubscriptionId: subscriptionId });
      }

      // Send purchase confirmation email
      if (updated.email) {
        sendMapHackPurchaseEmail(
          updated.email,
          updated.firstName || updated.email,
          verifiedPlan,
          expiresAt,
        ).catch(() => {});
      }

      const { passwordHash, ...safeUser } = updated;
      res.json({ success: true, plan: verifiedPlan, user: safeUser });
    } catch (error: unknown) {
      console.error("Error verifying map hack payment:", error);
      const msg = error instanceof Error ? error.message : "Greška pri verifikaciji";
      res.status(500).json({ message: msg });
    }
  });

  // ─── Map Hack NS — Customer Portal ────────────────────────────────────────

  app.post('/api/map-hack/customer-portal', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId;
      const currentUser = await storage.getUser(userId);

      const isSubscriptionPlan = currentUser?.mapHackPlan === 'premium' || currentUser?.mapHackPlan === 'godisnji_premium';
      if (!currentUser?.stripeCustomerId || !isSubscriptionPlan) {
        return res.status(400).json({ message: "Nema aktivne pretplate za upravljanje" });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: currentUser.stripeCustomerId,
        return_url: `${baseUrl}/map-hack`,
      });

      res.json({ url: portalSession.url });
    } catch (error: unknown) {
      console.error("Error creating customer portal session:", error);
      const msg = error instanceof Error ? error.message : "Greška pri otvaranju portala";
      res.status(500).json({ message: msg });
    }
  });

  // ─── Map Hack NS — Markers ────────────────────────────────────────────────

  function hasAcceptedMapHackPrivacy(user: any): boolean {
    if (user.isAdmin) return true;
    return !!user.mapPrivacyAcceptedAt;
  }

  function hasActiveMapHackPlan(user: any): boolean {
    if (user.isAdmin) return true;
    if (user.mapHackPlan === 'free') return true;
    if (user.mapNickname) {
      // has trial or paid plan — check expiry via mapHackPlanExpiresAt
      if (user.mapHackPlan && user.mapHackPlanExpiresAt) {
        return new Date() < new Date(user.mapHackPlanExpiresAt);
      }
      // trial: within 30 days of mapHackTrialStartedAt
      if (user.mapHackTrialStartedAt) {
        const expires = new Date(user.mapHackTrialStartedAt);
        expires.setDate(expires.getDate() + 30);
        return new Date() < expires;
      }
    }
    return false;
  }

  function hasPremiumMapHackPlan(user: any): boolean {
    if (user.isAdmin) return true;
    if (user.mapHackPlan === 'firma') {
      if (!user.mapHackPlanExpiresAt) return true; // firma without expiry = active
      return new Date() < new Date(user.mapHackPlanExpiresAt);
    }
    const paidPlans = ['premium', 'day_pass', 'godisnji_premium'];
    if (!paidPlans.includes(user.mapHackPlan || '')) return false;
    if (!user.mapHackPlanExpiresAt) return false;
    return new Date() < new Date(user.mapHackPlanExpiresAt);
  }

  app.get('/api/map-hack/markers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }
      if (!hasAcceptedMapHackPrivacy(user)) {
        return res.status(403).json({ code: "privacy_required", message: "Potrebno je prihvatiti Politiku privatnosti" });
      }
      const now = new Date();
      const markersWithNick = await db
        .select({
          id: mapMarkersTable.id,
          userId: mapMarkersTable.userId,
          type: mapMarkersTable.type,
          lat: mapMarkersTable.lat,
          lng: mapMarkersTable.lng,
          label: mapMarkersTable.label,
          createdAt: mapMarkersTable.createdAt,
          expiresAt: mapMarkersTable.expiresAt,
          mapNickname: usersTable.mapNickname,
        })
        .from(mapMarkersTable)
        .leftJoin(usersTable, eq(mapMarkersTable.userId, usersTable.id))
        .where(
          or(
            sql`${mapMarkersTable.expiresAt} IS NULL`,
            gt(mapMarkersTable.expiresAt, now)
          )
        )
        .orderBy(desc(mapMarkersTable.createdAt));
      const isPremiumUser = hasPremiumMapHackPlan(user);
      const filtered = isPremiumUser
        ? markersWithNick
        : markersWithNick.filter(m => m.type !== 'radar' && m.type !== 'stek');
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching map markers:", error);
      res.status(500).json({ message: "Greška pri učitavanju markera" });
    }
  });

  app.post('/api/map-hack/markers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }
      if (!hasAcceptedMapHackPrivacy(user)) {
        return res.status(403).json({ code: "privacy_required", message: "Potrebno je prihvatiti Politiku privatnosti" });
      }

      const { type, lat, lng } = req.body;
      const label: string | null = typeof req.body.label === 'string'
        ? req.body.label.trim().slice(0, 100) || null
        : null;
      const validTypes = ['zlatni_minut', 'pauk', 'stek', 'safe_zone', 'radar', 'kamera'];
      if (!type || !validTypes.includes(type)) {
        return res.status(400).json({ message: "Nevalidan tip markera" });
      }
      if (type === 'kamera' && !user.isAdmin) {
        return res.status(403).json({ message: "Samo admin može dodati kamere" });
      }
      if ((type === 'stek' || type === 'radar') && !hasPremiumMapHackPlan(user)) {
        return res.status(403).json({ message: "Ova funkcija zahteva Premium plan" });
      }

      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (isNaN(latNum) || isNaN(lngNum)) {
        return res.status(400).json({ message: "Nevalidne koordinate" });
      }
      // Bound to NS area
      if (latNum < 45.20 || latNum > 45.36 || lngNum < 19.72 || lngNum > 19.98) {
        return res.status(400).json({ message: "Lokacija mora biti u Novom Sadu" });
      }

      // Set expiry based on type
      let expiresAt: Date | null = null;
      if (type === 'zlatni_minut') {
        expiresAt = new Date(Date.now() + 60 * 60 * 1000);       // 1 sat
      } else if (type === 'pauk' || type === 'radar') {
        expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000);  // 4 sata
      }

      const ipAddress = (
        req.ip ||
        req.headers['x-forwarded-for']?.toString().split(',')[0].trim() ||
        req.socket?.remoteAddress ||
        null
      );

      const marker = await storage.createMapMarker({
        userId,
        type,
        lat: String(latNum),
        lng: String(lngNum),
        label: label || null,
        ipAddress,
        expiresAt,
      });

      if (type === 'zlatni_minut' || type === 'pauk' || type === 'radar') {
        const typeLabel = type === 'zlatni_minut' ? 'Zlatni Minut' : type === 'pauk' ? 'Pauk Radar' : 'Radar';
        const nick = user.mapNickname || 'Korisnik';
        try {
          const markerLabel = marker.label;
          const chatText = markerLabel
            ? `${nick} je prijavio/la: ${typeLabel} — ${markerLabel}`
            : `${nick} je prijavio/la: ${typeLabel}`;
          await storage.createMapChatMessage({
            userId: null,
            mapNickname: 'CarDrop Bot',
            avatarId: 0,
            text: chatText,
            isSystem: true,
            replyToId: null,
            replyToNickname: null,
            replyToText: null,
            lat: String(latNum),
            lng: String(lngNum),
          });
        } catch (_) {
          // system message failure is non-critical
        }

        // Pauk / Zlatni Minut — broadcast to ALL subscribed users (free + premium), excluding sender
        if (type === 'pauk' || type === 'zlatni_minut') {
          try {
            const allSubs = await db.select().from(pushSubscriptionsTable);
            const uniqueUserIds = Array.from(new Set(allSubs.map(s => s.userId))).filter(uid => uid !== userId);
            const pushTitle = type === 'pauk' ? 'Pauk u NS!' : 'Zlatni Minut u NS!';
            const pushBody = type === 'pauk'
              ? 'Pauk prijavljen u Novom Sadu — proveri mapu!'
              : 'Slobodan parking prijavljen — brži ko brži!';
            await Promise.allSettled(uniqueUserIds.map(async uid => {
              const u = await storage.getUser(uid);
              if (!u || u.mapNotificationsEnabled === false) return;
              await sendPushToUser(uid, {
                title: pushTitle,
                body: pushBody,
                icon: '/icons/icon-192x192.png',
                tag: `broadcast-${type}`,
                url: '/map-hack',
              }).catch(() => {});
            }));
          } catch (_) {
            // push failure is non-critical
          }
        }

        // Radar / Štek — zone-based, premium users only (watch area + safe zone)
        if (type === 'radar' || type === 'stek') {
          try {
            const watchAreas = await storage.getAllMapWatchAreas();
            for (const area of watchAreas) {
              if (area.userId === userId) continue;
              const watcher = await storage.getUser(area.userId);
              if (!watcher || !hasPremiumMapHackPlan(watcher)) continue;
              if (watcher.mapNotificationsEnabled === false) continue;
              const dist = haversineMetersServer(parseFloat(area.lat), parseFloat(area.lng), latNum, lngNum);
              if (dist <= area.radiusMeters) {
                const pushTitle = type === 'radar' ? 'Radar u tvojoj zoni!' : 'Štek u tvojoj zoni!';
                const pushBody = type === 'radar'
                  ? 'Policijski radar prijavljen u tvojoj Watch zoni.'
                  : 'Novo štek mesto prijavljeno u tvojoj Watch zoni.';
                await sendPushToUser(area.userId, { title: pushTitle, body: pushBody, icon: '/icons/icon-192x192.png', tag: `watch-area-${type}`, url: '/map-hack' }).catch(() => {});
              }
            }
          } catch (_) { }

          try {
            const safeZones = await storage.getAllMapSafeZones();
            for (const zone of safeZones) {
              if (zone.userId === userId) continue;
              const owner = await storage.getUser(zone.userId);
              if (!owner || !hasPremiumMapHackPlan(owner)) continue;
              if (owner.mapNotificationsEnabled === false) continue;
              const dist = haversineMetersServer(parseFloat(zone.lat), parseFloat(zone.lng), latNum, lngNum);
              if (dist <= zone.radiusMeters) {
                const pushTitle = type === 'radar' ? 'Radar u tvojoj Safe Zoni!' : 'Štek u tvojoj Safe Zoni!';
                const pushBody = type === 'radar'
                  ? 'Policijski radar prijavljen unutar tvoje Safe Zone.'
                  : 'Novo štek mesto prijavljeno unutar tvoje Safe Zone.';
                await sendPushToUser(zone.userId, { title: pushTitle, body: pushBody, icon: '/icons/icon-192x192.png', tag: `safe-zone-${type}`, url: '/map-hack' }).catch(() => {});
              }
            }
          } catch (_) { }
        }
      }

      res.json(marker);
    } catch (error) {
      console.error("Error creating map marker:", error);
      res.status(500).json({ message: "Greška pri kreiranju markera" });
    }
  });

  app.post('/api/map-hack/markers/:id/expire', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }

      // Fetch marker and enforce ownership or admin
      const markers = await storage.getActiveMapMarkers();
      const marker = markers.find(m => m.id === req.params.id);
      if (!marker) {
        return res.status(404).json({ message: "Marker nije pronađen" });
      }
      if (marker.userId !== userId && !user.isAdmin) {
        return res.status(403).json({ message: "Nemate dozvolu da obrišete ovaj marker" });
      }

      await storage.expireMapMarker(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error expiring map marker:", error);
      res.status(500).json({ message: "Greška pri brisanju markera" });
    }
  });

  // ─── Map Hack NS — Update marker label (comment / info) ─────────────────

  app.patch('/api/map-hack/markers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }

      const markers = await storage.getActiveMapMarkers();
      const marker = markers.find(m => m.id === req.params.id);
      if (!marker) return res.status(404).json({ message: "Marker nije pronađen" });

      // Only owner can edit zlatni_minut; only admin can edit stek/pauk
      if (marker.type === "zlatni_minut") {
        if (marker.userId !== userId) {
          return res.status(403).json({ message: "Samo vlasnik može menjati komentar" });
        }
      } else {
        if (!user.isAdmin) {
          return res.status(403).json({ message: "Samo admin može menjati informacije" });
        }
      }

      const rawLabel: string | undefined = req.body.label;
      const label = typeof rawLabel === "string" ? rawLabel.slice(0, 100).trim() || null : null;
      const updated = await storage.updateMapMarkerLabel(req.params.id, label);

      // Create system chat message when label is updated on zlatni_minut or pauk
      if (updated.type === 'zlatni_minut' || updated.type === 'pauk') {
        const nick = user.mapNickname || 'Korisnik';
        try {
          const chatText = label
            ? `${nick} je dodao/la komentar: ${label}`
            : `${nick} je uklonio/la komentar`;
          await storage.createMapChatMessage({
            userId: null,
            mapNickname: 'CarDrop Bot',
            avatarId: 0,
            text: chatText,
            isSystem: true,
            replyToId: null,
            replyToNickname: null,
            replyToText: null,
          });
        } catch (_) {
          // system message failure is non-critical
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating marker label:", error);
      res.status(500).json({ message: "Greška pri ažuriranju markera" });
    }
  });

  // ─── Map Hack NS — Parking Listings (app rentals on map) ─────────────────

  app.get('/api/map-hack/parking-listings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(403).json({ message: "Niste prijavljeni" });
      }
      const spots = await storage.getAllParkingSpots();
      const listings = spots
        .filter(s => s.isActive && s.latitude && s.longitude)
        .map(s => ({
          id: s.id,
          title: s.title,
          address: s.address,
          latitude: s.latitude,
          longitude: s.longitude,
          pricePerHour: s.pricePerHour,
          pricingType: s.pricingType,
          spotType: s.spotType,
          is24Hours: s.is24Hours,
          hasEvCharging: s.hasEvCharging,
          hasSecurityCamera: s.hasSecurityCamera,
          description: s.description,
          phone: s.phone,
          contactEmail: s.contactEmail,
          subscriptionType: s.subscriptionType,
          imageUrls: s.imageUrls,
          city: s.city,
        }));
      res.json(listings);
    } catch (error) {
      console.error("Error fetching parking listings for map:", error);
      res.status(500).json({ message: "Greška pri učitavanju oglasa" });
    }
  });

  // ─── Map Hack NS — Chat ───────────────────────────────────────────────────

  app.get('/api/map-hack/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }
      if (!hasAcceptedMapHackPrivacy(user)) {
        return res.status(403).json({ code: "privacy_required", message: "Potrebno je prihvatiti Politiku privatnosti" });
      }
      const messages = await storage.getMapChatMessages();
      res.json(messages);
    } catch (error) {
      console.error("Error fetching map chat:", error);
      res.status(500).json({ message: "Greška pri učitavanju chata" });
    }
  });

  const chatRateLimitMap = new Map<string, number>();
  const CHAT_RATE_LIMIT_MS = 60_000;

  app.post('/api/map-hack/chat', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }
      if (!hasAcceptedMapHackPrivacy(user)) {
        return res.status(403).json({ code: "privacy_required", message: "Potrebno je prihvatiti Politiku privatnosti" });
      }
      if (!user.mapNickname) {
        return res.status(400).json({ message: "Potreban je Map Hack profil" });
      }

      const lastSent = chatRateLimitMap.get(userId) ?? 0;
      const elapsed = Date.now() - lastSent;
      if (elapsed < CHAT_RATE_LIMIT_MS) {
        const retryAfter = Math.ceil((CHAT_RATE_LIMIT_MS - elapsed) / 1000);
        return res.status(429).json({ message: `Sačekaj ${retryAfter}s pre sledeće poruke`, retryAfter });
      }

      const { text, replyToId, replyToNickname, replyToText } = req.body;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return res.status(400).json({ message: "Poruka ne može biti prazna" });
      }
      if (text.trim().length > 280) {
        return res.status(400).json({ message: "Poruka je predugačka (max 280 znakova)" });
      }

      chatRateLimitMap.set(userId, Date.now());
      const trimmedText = text.trim();
      const msg = await storage.createMapChatMessage({
        userId,
        mapNickname: user.mapNickname,
        avatarId: user.mapAvatarId || 1,
        text: trimmedText,
        isSystem: false,
        replyToId: replyToId || null,
        replyToNickname: replyToNickname || null,
        replyToText: replyToText ? String(replyToText).slice(0, 120) : null,
      });

      res.json(msg);

      // Admin chat messages broadcast push to all subscribed users (excluding sender)
      if (user.isAdmin) {
        setImmediate(async () => {
          try {
            const allSubs = await db.select().from(pushSubscriptionsTable);
            const uniqueUserIds = Array.from(new Set(allSubs.map((s) => s.userId))).filter((uid) => uid !== userId);
            await Promise.allSettled(uniqueUserIds.map(async (uid) => {
              const u = await storage.getUser(uid);
              if (!u || u.mapNotificationsEnabled === false) return;
              await sendPushToUser(uid, {
                title: `${user.mapNickname} u chatu`,
                body: trimmedText.slice(0, 100),
                icon: '/icons/icon-192x192.png',
                tag: 'chat-message',
                url: '/map-hack',
              }).catch(() => {});
            }));
          } catch (_) {}
        });
      }
    } catch (error) {
      console.error("Error posting map chat message:", error);
      res.status(500).json({ message: "Greška pri slanju poruke" });
    }
  });

  // ─── Map Hack NS — Voice Upload (server-side, single step) ──────────────

  app.post(
    '/api/map-hack/chat/voice',
    isAuthenticated,
    express.raw({ type: ['audio/*', 'application/octet-stream'], limit: '5mb' }),
    async (req: any, res) => {
      try {
        const userId = req.session.userId;
        const user = await storage.getUser(userId);
        if (!user || !hasActiveMapHackPlan(user)) {
          return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
        }
        if (!hasAcceptedMapHackPrivacy(user)) {
          return res.status(403).json({ code: "privacy_required", message: "Potrebno je prihvatiti Politiku privatnosti" });
        }
        if (!user.mapNickname) {
          return res.status(400).json({ message: "Potreban je Map Hack profil" });
        }

        const lastSent = chatRateLimitMap.get(userId) ?? 0;
        const elapsed = Date.now() - lastSent;
        if (elapsed < CHAT_RATE_LIMIT_MS) {
          const retryAfter = Math.ceil((CHAT_RATE_LIMIT_MS - elapsed) / 1000);
          return res.status(429).json({ message: `Sačekaj ${retryAfter}s pre sledeće poruke`, retryAfter });
        }

        const audioBuffer: Buffer = req.body;
        if (!Buffer.isBuffer(audioBuffer) || audioBuffer.length < 1000) {
          return res.status(400).json({ message: "Audio fajl je previše mali ili nije validan" });
        }
        if (audioBuffer.length > 5 * 1024 * 1024) {
          return res.status(413).json({ message: "Audio fajl je prevelik (max 5MB)" });
        }

        const contentType = req.get('Content-Type') || 'audio/webm';
        const replyToId = req.get('X-Reply-To-Id') || null;
        const replyToNickname = req.get('X-Reply-To-Nickname') || null;
        const replyToText = req.get('X-Reply-To-Text') || null;

        const objectStorageService = new ObjectStorageService();
        const audioUrl = await objectStorageService.uploadVoiceBuffer(audioBuffer, contentType);

        chatRateLimitMap.set(userId, Date.now());
        const msg = await storage.createMapChatMessage({
          userId,
          mapNickname: user.mapNickname,
          avatarId: user.mapAvatarId || 1,
          audioUrl,
          isSystem: false,
          replyToId: replyToId || null,
          replyToNickname: replyToNickname || null,
          replyToText: replyToText ? String(replyToText).slice(0, 120) : null,
        });

        res.json(msg);
      } catch (error) {
        console.error("Error uploading voice message:", error);
        res.status(500).json({ message: "Greška pri slanju glasovne poruke" });
      }
    }
  );

  // ─── Map Hack NS — Voice stream (auth-gated) ─────────────────────────────

  app.get('/api/map-hack/chat/voice/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }
      const objectPath = `/objects/voice/${req.params.id}`;
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(objectPath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      console.error("Error streaming voice message:", error);
      return res.sendStatus(500);
    }
  });

  // ─── Map Hack NS — Admin delete chat message ──────────────────────────────

  app.delete('/api/map-hack/chat/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || (!user.isAdmin && !ADMIN_EMAIL_LIST.includes(user.email || ''))) {
        return res.status(403).json({ message: "Nemate dozvolu" });
      }
      await storage.deleteMapChatMessage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting chat message:", error);
      res.status(500).json({ message: "Greška pri brisanju poruke" });
    }
  });

  // ─── Map Hack NS — Safe Zone ──────────────────────────────────────────────

  app.get('/api/map-hack/safe-zone', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }
      const zone = await storage.getMapSafeZone(userId);
      res.json(zone || null);
    } catch (error) {
      console.error("Error fetching safe zone:", error);
      res.status(500).json({ message: "Greška pri učitavanju safe zone" });
    }
  });

  app.put('/api/map-hack/safe-zone', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }

      const { lat, lng, radiusMeters } = req.body;
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      const radius = parseInt(radiusMeters) || 300;

      if (isNaN(latNum) || isNaN(lngNum)) {
        return res.status(400).json({ message: "Nevalidne koordinate" });
      }
      if (latNum < 45.20 || latNum > 45.36 || lngNum < 19.72 || lngNum > 19.98) {
        return res.status(400).json({ message: "Lokacija mora biti u Novom Sadu" });
      }

      const zone = await storage.upsertMapSafeZone(userId, {
        lat: String(latNum),
        lng: String(lngNum),
        radiusMeters: Math.min(Math.max(radius, 50), 2000),
      });
      res.json(zone);
    } catch (error) {
      console.error("Error setting safe zone:", error);
      res.status(500).json({ message: "Greška pri postavljanju safe zone" });
    }
  });

  app.delete('/api/map-hack/safe-zone', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }
      await storage.deleteMapSafeZone(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting safe zone:", error);
      res.status(500).json({ message: "Greška pri brisanju safe zone" });
    }
  });

  // ─── Map Hack NS — Watch Area ─────────────────────────────────────────────

  app.get('/api/map-hack/watch-area', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasPremiumMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je Premium plan" });
      }
      const area = await storage.getMapWatchArea(userId);
      res.json(area || null);
    } catch (error) {
      console.error("Error fetching watch area:", error);
      res.status(500).json({ message: "Greška pri učitavanju zone upozorenja" });
    }
  });

  app.post('/api/map-hack/watch-area', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasPremiumMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je Premium plan" });
      }

      const { lat, lng } = req.body;
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);

      if (isNaN(latNum) || isNaN(lngNum)) {
        return res.status(400).json({ message: "Nevalidne koordinate" });
      }
      if (latNum < 45.20 || latNum > 45.36 || lngNum < 19.72 || lngNum > 19.98) {
        return res.status(400).json({ message: "Lokacija mora biti u Novom Sadu" });
      }

      const area = await storage.upsertMapWatchArea(userId, {
        lat: String(latNum),
        lng: String(lngNum),
        radiusMeters: 300,
      });
      res.json(area);
    } catch (error) {
      console.error("Error setting watch area:", error);
      res.status(500).json({ message: "Greška pri postavljanju zone upozorenja" });
    }
  });

  app.delete('/api/map-hack/watch-area', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasPremiumMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je Premium plan" });
      }
      await storage.deleteMapWatchArea(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting watch area:", error);
      res.status(500).json({ message: "Greška pri brisanju zone upozorenja" });
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
      const { sessionId } = req.body;
      const userId = req.session.userId;

      if (!sessionId) {
        return res.status(400).json({ message: "Missing sessionId" });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed", status: session.payment_status });
      }

      // Verify caller owns this session
      if (session.metadata?.userId !== String(userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Use spotId from verified Stripe metadata — never trust client-supplied spotId
      const spotId = session.metadata?.spotId;
      if (!spotId) {
        return res.status(400).json({ message: "Invalid session: missing spotId" });
      }

      const existingSpot = await storage.getParkingSpot(spotId);
      if (!existingSpot) {
        return res.status(404).json({ message: "Spot not found" });
      }

      // Verify caller owns the target spot
      if (existingSpot.ownerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const rawTier = session.metadata?.tier;
      if (rawTier !== 'silver' && rawTier !== 'gold') {
        return res.status(400).json({ message: "Invalid tier in session metadata" });
      }
      const tier: 'silver' | 'gold' = rawTier;
      const { calculateExpiryDate } = await import('../shared/pricing.js');
      const subscriptionExpiresAt = calculateExpiryDate(tier);

      // Atomically record consumed session + activate spot in one transaction
      // (unique constraint on stripeSessionId rejects concurrent/duplicate attempts)
      const { spot, alreadyConsumed: spotAlreadyConsumed } = await storage.activateSpotWithSession(spotId, tier, subscriptionExpiresAt, sessionId, userId);

      if (!spot) return res.status(404).json({ message: "Spot not found" });

      if (spotAlreadyConsumed) {
        return res.status(409).json({ message: "Session already consumed", spot });
      }

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
      const { sessionId } = req.body;
      const userId = req.session.userId;

      if (!sessionId) {
        return res.status(400).json({ message: "Missing sessionId" });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Payment not completed", status: session.payment_status });
      }

      // Verify caller owns this session
      if (session.metadata?.userId !== String(userId)) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Use listingId from verified Stripe metadata — never trust client-supplied listingId
      const listingId = session.metadata?.listingId;
      if (!listingId) {
        return res.status(400).json({ message: "Invalid session: missing listingId" });
      }

      const existingListing = await storage.getSalesListing(listingId);
      if (!existingListing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      // Verify caller owns the target listing
      if (existingListing.sellerId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const rawTierListing = session.metadata?.tier;
      if (rawTierListing !== 'silver' && rawTierListing !== 'gold') {
        return res.status(400).json({ message: "Invalid tier in session metadata" });
      }
      const tierListing: 'silver' | 'gold' = rawTierListing;
      const { calculateExpiryDate } = await import('../shared/pricing.js');
      const subscriptionExpiresAt = calculateExpiryDate(tierListing);

      // Atomically record consumed session + activate listing in one transaction
      // (unique constraint on stripeSessionId rejects concurrent/duplicate attempts)
      const { listing, alreadyConsumed: listingAlreadyConsumed } = await storage.activateSalesListingWithSession(listingId, tierListing, subscriptionExpiresAt, sessionId, userId);

      if (!listing) return res.status(404).json({ message: "Listing not found" });

      if (listingAlreadyConsumed) {
        return res.status(409).json({ message: "Session already consumed", listing });
      }

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

  // User routes — returns minimal public profile only (no PII, credentials, or billing data)
  app.get('/api/users/:id', async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      // Return only what is needed to display a spot/listing owner card
      res.json({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        mapNickname: user.mapNickname,
        mapAvatarId: user.mapAvatarId,
        createdAt: user.createdAt,
      });
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
      const userId = req.session.userId;
      const booking = await storage.getBooking(req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      // Only renter or spot owner may view a specific booking
      if (booking.renterId !== userId) {
        const spot = await storage.getParkingSpot(booking.spotId);
        if (!spot || spot.ownerId !== userId) {
          return res.status(403).json({ message: "Forbidden" });
        }
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

      // Only accept user-supplied fields; price/status computed server-side
      const { spotId, startTime, endTime } = bookingCreateSchema.parse(req.body);

      if (endTime <= startTime) {
        return res.status(400).json({ message: "Vreme završetka mora biti posle početka" });
      }

      const spot = await storage.getParkingSpot(spotId);
      if (!spot) {
        return res.status(404).json({ message: "Parking mesto nije pronađeno" });
      }
      if (!spot.isActive) {
        return res.status(400).json({ message: "Parking mesto nije aktivno" });
      }
      if (spot.ownerId === userId) {
        return res.status(400).json({ message: "Ne možete rezervisati sopstveno parking mesto" });
      }

      // Compute total price server-side from spot's hourly rate
      const hours = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60));
      const totalPrice = (parseFloat(spot.pricePerHour) * hours).toFixed(2);

      // Check for conflicting bookings
      const existingBookings = await storage.getSpotBookings(spotId);
      const hasConflict = existingBookings.some((booking) => {
        if (booking.status === 'cancelled') return false;
        const newStart = startTime;
        const newEnd = endTime;
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
        spotId,
        startTime,
        endTime,
        totalPrice,
        currency: spot.currency,
        status: 'pending',
        paymentStatus: 'pending',
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
      
      const validatedData = parkingSpotEditSchema.parse(req.body);
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

  // Self-delete account (Google Play requirement)
  app.delete('/api/users/me', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;

      // Cancel all active Stripe subscriptions before deleting the account
      const currentUser = await storage.getUser(userId);
      if (currentUser?.stripeCustomerId || currentUser?.stripeSubscriptionId) {
        const stripe = await getUncachableStripeClient();

        // Cancel by stored subscription ID first (fast path)
        if (currentUser.stripeSubscriptionId) {
          try {
            await stripe.subscriptions.cancel(currentUser.stripeSubscriptionId);
            console.log(`Cancelled Stripe subscription ${currentUser.stripeSubscriptionId} for user ${userId}`);
          } catch (err: unknown) {
            const stripeErr = err as Stripe.errors.StripeError;
            const alreadyGone = stripeErr.code === 'resource_missing' ||
              stripeErr.statusCode === 404 ||
              stripeErr.message?.includes('No such subscription');
            if (!alreadyGone) throw err;
            console.warn(`Stripe subscription ${currentUser.stripeSubscriptionId} already gone for user ${userId}`);
          }
        }

        // Always sweep by customer ID to cancel any additional or orphaned subscriptions
        if (currentUser.stripeCustomerId) {
          const billableStatuses: Stripe.SubscriptionListParams.Status[] = ['active', 'trialing', 'past_due', 'unpaid', 'paused'];
          for (const status of billableStatuses) {
            let startingAfter: string | undefined;
            do {
              const page: Stripe.ApiList<Stripe.Subscription> = await stripe.subscriptions.list({
                customer: currentUser.stripeCustomerId,
                status,
                limit: 100,
                ...(startingAfter ? { starting_after: startingAfter } : {}),
              });
              for (const sub of page.data) {
                if (sub.id === currentUser.stripeSubscriptionId) continue;
                try {
                  await stripe.subscriptions.cancel(sub.id);
                  console.log(`Cancelled additional Stripe subscription ${sub.id} for user ${userId}`);
                } catch (err: unknown) {
                  const sweepErr = err as Stripe.errors.StripeError;
                  const alreadyGone = sweepErr.code === 'resource_missing' ||
                    sweepErr.statusCode === 404 ||
                    sweepErr.message?.includes('No such subscription');
                  if (!alreadyGone) throw err;
                  console.warn(`Stripe subscription ${sub.id} already gone during sweep for user ${userId}`);
                }
              }
              startingAfter = page.has_more ? page.data[page.data.length - 1]?.id : undefined;
            } while (startingAfter);
          }
        }
      }

      await storage.deleteUser(userId);
      req.session.destroy((err: Error | null) => {
        if (err) console.error("Session destroy error after account deletion:", err);
        res.clearCookie('connect.sid');
        res.json({ ok: true });
      });
    } catch (error: unknown) {
      const stripeErr = error as Stripe.errors.StripeError;
      if (stripeErr?.type?.startsWith('Stripe')) {
        console.error("Stripe error while cancelling subscription on account deletion:", error);
        res.status(502).json({ message: "Nije moguće otkazati pretplatu. Pokušaj ponovo ili kontaktiraj podršku." });
      } else {
        console.error("Error deleting user account:", error);
        res.status(500).json({ message: "Greška pri brisanju naloga" });
      }
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
        body: `${senderName}: ${spotTitle}`,
        url: '/dashboard?tab=messages',
        tag: `msg-${userId}`,
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
      const userId = req.session.userId;
      const userMessages = await storage.getUserMessages(userId);
      const msg = userMessages.find(m => m.id === req.params.id);
      if (!msg) {
        return res.status(404).json({ message: "Poruka nije pronađena" });
      }
      if (msg.receiverId !== userId) {
        return res.status(403).json({ message: "Nemate dozvolu" });
      }
      await storage.markMessageAsRead(req.params.id);
      res.json({ message: "Poruka označena kao pročitana" });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ message: "Greška" });
    }
  });

  // Admin middleware (uses the same ADMIN_EMAIL_LIST constant defined above)
  const isAdmin = async (req: any, res: any, next: any) => {
    const userId = req.session?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    const hasAdminAccess = user.isAdmin || ADMIN_EMAIL_LIST.includes(user.email || '');
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

  // City abbreviation map for auto-numbering
  const CITY_ABBREV: Record<string, string> = {
    "Beograd": "BG", "Novi Sad": "NS", "Niš": "NI", "Kragujevac": "KG",
    "Subotica": "SU", "Zrenjanin": "ZR", "Pančevo": "PA", "Čačak": "CA",
    "Novi Pazar": "NP", "Jagodina": "JA", "Šabac": "SA", "Smederevo": "SM",
    "Valjevo": "VA", "Vranje": "VR", "Kraljevo": "KV", "Leskovac": "LE",
    "Užice": "UZ", "Sombor": "SO", "Kruševac": "KR", "Ostalo": "SRB",
  };

  async function generateParkingNumber(city: string | null | undefined): Promise<string> {
    const abbrev = (city && CITY_ABBREV[city]) ? CITY_ABBREV[city] : "SRB";
    const allSpots = await storage.getAllParkingSpotsAdmin();
    const sameCity = allSpots.filter(s => s.parkingNumber && s.parkingNumber.startsWith(abbrev));
    const n = sameCity.length + 1;
    return `${abbrev}${n}`;
  }

  app.get('/api/admin/parking-spots', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const spots = await storage.getAllParkingSpotsAdmin();
      res.json(spots);
    } catch (error) {
      console.error("Error fetching all parking spots:", error);
      res.status(500).json({ message: "Failed to fetch parking spots" });
    }
  });

  app.post('/api/admin/parking-spots', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const body = req.body;
      const parkingNumber = await generateParkingNumber(body.city);
      const spotData: any = {
        ownerId: userId,
        category: body.category || 'private',
        title: body.title,
        description: body.description || '',
        address: body.address,
        city: body.city || null,
        latitude: String(body.latitude || '0'),
        longitude: String(body.longitude || '0'),
        pricePerHour: String(body.pricePerHour || '0'),
        currency: body.currency || 'RSD',
        spotType: body.spotType || 'uncovered',
        hasEvCharging: body.hasEvCharging || false,
        hasSecurityCamera: body.hasSecurityCamera || false,
        is24Hours: body.is24Hours !== undefined ? body.is24Hours : true,
        phone: body.phone || '',
        paymentType: body.paymentType || 'cash',
        contactEmail: body.contactEmail || '',
        advertiserType: body.advertiserType || 'owner',
        companyName: body.companyName || null,
        pib: body.pib || null,
        numberOfSpots: body.numberOfSpots || null,
        contactPerson: body.contactPerson || null,
        pricingType: body.pricingType || 'daily',
        subscriptionType: body.subscriptionType || 'standard',
        autoRenewal: body.autoRenewal || false,
        isPremium: body.isPremium || false,
        isActive: body.isActive !== undefined ? body.isActive : true,
        parkingNumber,
        stripeLink: body.stripeLink || null,
        stripeLinkActive: body.stripeLinkActive || false,
      };
      const spot = await storage.createParkingSpot(spotData);
      res.status(201).json(spot);
    } catch (error) {
      console.error("Error creating parking spot (admin):", error);
      res.status(500).json({ message: "Failed to create parking spot" });
    }
  });

  app.patch('/api/admin/parking-spots/:id/full-edit', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const body = req.body;
      const updates: any = {};
      const fields = ['title', 'description', 'address', 'city', 'latitude', 'longitude',
        'pricePerHour', 'currency', 'spotType', 'hasEvCharging', 'hasSecurityCamera',
        'is24Hours', 'phone', 'paymentType', 'contactEmail', 'advertiserType',
        'companyName', 'pib', 'numberOfSpots', 'contactPerson', 'pricingType',
        'subscriptionType', 'autoRenewal', 'isPremium', 'isActive',
        'stripeLink', 'stripeLinkActive', 'category'];
      for (const f of fields) {
        if (body[f] !== undefined) updates[f] = body[f];
      }
      if (updates.latitude !== undefined) updates.latitude = String(updates.latitude);
      if (updates.longitude !== undefined) updates.longitude = String(updates.longitude);
      if (updates.pricePerHour !== undefined) updates.pricePerHour = String(updates.pricePerHour);
      const spot = await storage.updateParkingSpot(req.params.id, updates);
      if (!spot) return res.status(404).json({ message: "Parking spot not found" });
      res.json(spot);
    } catch (error) {
      console.error("Error full-editing parking spot (admin):", error);
      res.status(500).json({ message: "Failed to update parking spot" });
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

  // Admin Map Hack NS routes
  app.get('/api/admin/map-hack/markers', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const markers = await storage.getAllMapMarkers();
      res.json(markers);
    } catch (error) {
      console.error("Error fetching admin map markers:", error);
      res.status(500).json({ message: "Failed to fetch map markers" });
    }
  });

  app.delete('/api/admin/map-hack/markers/:id', isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteMapMarker(req.params.id);
      res.json({ ok: true });
    } catch (error) {
      console.error("Error deleting map marker:", error);
      res.status(500).json({ message: "Failed to delete map marker" });
    }
  });

  // Admin: ručno dodjeljivanje Map Hack plana korisniku
  app.post('/api/admin/grant-map-hack-plan', isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { email, plan } = req.body as { email: string; plan: string };
      const validPlans = ["premium", "godisnji_premium", "day_pass", "firma"];
      if (!email || !plan || !validPlans.includes(plan)) {
        return res.status(400).json({ message: "Nevalidan email ili plan" });
      }
      const targetUser = await storage.getUserByEmail(email.trim().toLowerCase());
      if (!targetUser) {
        return res.status(404).json({ message: `Korisnik sa emailom ${email} nije pronađen` });
      }
      const expiresAt = plan === "day_pass" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null;
      await storage.updateMapHackPlan(targetUser.id, plan, expiresAt);
      res.json({ success: true, userId: targetUser.id, email: targetUser.email, plan, expiresAt });
    } catch (error) {
      console.error("Error granting map hack plan:", error);
      res.status(500).json({ message: "Greška pri dodjeljivanju plana" });
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
      const validatedData = insertSalesListingSchema.parse(sanitizedBody);

      // Always create standard listings as active — premium activation goes through Stripe
      // Force subscriptionType/isPremium server-side; client cannot self-upgrade
      const listing = await storage.createSalesListing({
        ...validatedData,
        sellerId: userId,
        subscriptionType: 'standard',
        isPremium: false,
        isActive: true,
      });
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

  // Editable fields for a sales listing — payment/activation fields are excluded
  const salesListingEditSchema = insertSalesListingSchema
    .omit({
      isActive: true,
      isPremium: true,
      subscriptionType: true,
    })
    .partial();

  app.patch('/api/sales-listings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const listing = await storage.getSalesListing(req.params.id);
      if (!listing) return res.status(404).json({ message: "Listing not found" });
      if (listing.sellerId !== userId) return res.status(403).json({ message: "Not authorized" });
      const sanitizedBody = sanitizeObject(req.body);
      const validatedData = salesListingEditSchema.parse(sanitizedBody);
      const updated = await storage.updateSalesListing(req.params.id, validatedData);
      res.json(updated);
    } catch (error: any) {
      console.error("Error updating sales listing:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Nevalidni podaci", errors: error.errors });
      }
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
