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
import { totalWithFee } from "@shared/stripeFee";
import { getStripePriceId, getMapHackPriceId, getMapHackRecurringPriceId, getPlanBasePrice, type ProductCategory } from "./stripeProducts";
import { db } from "./db";
import { sql, eq, or, gt, desc } from "drizzle-orm";
import { mapMarkers as mapMarkersTable, users as usersTable, pushSubscriptions as pushSubscriptionsTable, bookings } from "@shared/schema";
import { sanitizeObject } from './sanitize';
import { sendMapHackPurchaseEmail, sendBookingOwnerEmail, sendBookingApprovedEmail, sendBookingRejectedEmail, sendBookingPendingApprovalEmail } from './email';
import { randomBytes } from 'crypto';

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

function getBuildVersion(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const html = fs.readFileSync(path.join(process.cwd(), 'dist/public/index.html'), 'utf8');
    const m = html.match(/\/assets\/index-([^.]+)\.js/);
    if (m) return m[1];
  } catch {}
  return Date.now().toString();
}
const SERVER_BUILD_VERSION = getBuildVersion();

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Public version endpoint — client uses this to detect deploys and reload stale JS
  app.get('/api/version', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json({ version: SERVER_BUILD_VERSION });
  });

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
      if (!/^[a-zA-Z0-9_\- ]+$/.test(trimmed)) {
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

      // 30-day cooldown for profile changes (skip for admins and first-time onboarding)
      const isAdminUser = currentUser?.isAdmin || ADMIN_EMAIL_LIST.includes(currentUser?.email || '');
      const isFirstTimeOnboarding = !currentUser?.mapNickname;
      if (!isAdminUser && !isFirstTimeOnboarding && currentUser?.mapProfileLastChangedAt) {
        const lastChanged = new Date(currentUser.mapProfileLastChangedAt);
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const nextAllowed = new Date(lastChanged.getTime() + thirtyDaysMs);
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

      const planInfo = validPlans[plan];
      const baseAmountRsd = planInfo.amount / 100;
      const totalAmountParas = Math.round(totalWithFee(baseAmountRsd) * 100);

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

        const recurringInterval: 'month' | 'year' = plan === 'godisnji_premium' ? 'year' : 'month';

        sessionParams = {
          customer: stripeCustomerId,
          line_items: [{
            price_data: {
              currency: 'rsd',
              unit_amount: totalAmountParas,
              product_data: { name: planInfo.name, description: planInfo.description },
              recurring: { interval: recurringInterval },
            },
            quantity: 1,
          }],
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
          line_items: [{
            price_data: {
              currency: 'rsd',
              unit_amount: totalAmountParas,
              product_data: { name: planInfo.name, description: planInfo.description },
            },
            quantity: 1,
          }],
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
      // Serbia-wide bounds (rough bounding box)
      if (latNum < 42.0 || latNum > 46.5 || lngNum < 18.5 || lngNum > 23.0) {
        return res.status(400).json({ message: "Lokacija mora biti u Srbiji" });
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

      // Owner can edit their own zlatni_minut or stek; admin can edit anything
      const isOwner = marker.userId === userId;
      if (marker.type === "zlatni_minut" || marker.type === "stek") {
        if (!isOwner && !user.isAdmin) {
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
          pricePerDay: s.pricePerDay,
          pricePerWeek: s.pricePerWeek,
          pricePerMonth: s.pricePerMonth,
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
          parkingNumber: s.parkingNumber,
          stripeLinkActive: s.stripeLinkActive,
          totalSpaces: s.totalSpaces ?? 1,
          hasRamp: s.hasRamp ?? false,
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

  // ─── Map Hack NS — Edit / Delete chat message (owner or admin) ───────────

  app.patch('/api/map-hack/chat/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }
      const msgs = await storage.getMapChatMessages(200);
      const msg = msgs.find(m => m.id === req.params.id);
      if (!msg) return res.status(404).json({ message: "Poruka nije pronađena" });
      if (msg.isSystem) return res.status(403).json({ message: "Sistemske poruke se ne mogu menjati" });
      if (msg.userId !== userId && !user.isAdmin) {
        return res.status(403).json({ message: "Možete menjati samo svoje poruke" });
      }
      const text: string = (req.body.text ?? "").slice(0, 500).trim();
      if (!text) return res.status(400).json({ message: "Poruka ne može biti prazna" });
      const updated = await storage.updateMapChatMessage(req.params.id, text);
      res.json(updated);
    } catch (error) {
      console.error("Error editing chat message:", error);
      res.status(500).json({ message: "Greška pri izmeni poruke" });
    }
  });

  app.delete('/api/map-hack/chat/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user || !hasActiveMapHackPlan(user)) {
        return res.status(403).json({ message: "Potreban je aktivan Map Hack plan" });
      }
      const msgs = await storage.getMapChatMessages(200);
      const msg = msgs.find(m => m.id === req.params.id);
      if (!msg) return res.status(404).json({ message: "Poruka nije pronađena" });
      if (msg.userId !== userId && !user.isAdmin && !ADMIN_EMAIL_LIST.includes(user.email || '')) {
        return res.status(403).json({ message: "Možete brisati samo svoje poruke" });
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
  // Strip sensitive server-only fields before sending spot to client
  function safeSpot<T extends { rampPhone?: string | null; rampWebhookUrl?: string | null }>(spot: T): Omit<T, 'rampPhone' | 'rampWebhookUrl'> {
    const { rampPhone: _rp, rampWebhookUrl: _rwu, ...safe } = spot;
    return safe;
  }

  app.get('/api/parking-spots', async (req, res) => {
    try {
      const spots = await storage.getAllParkingSpots();
      res.json(spots.map(safeSpot));
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
      res.json(spots.map(safeSpot));
    } catch (error) {
      console.error("Error fetching user parking spots:", error);
      res.status(500).json({ message: "Greška pri učitavanju parking mesta" });
    }
  });

  app.get('/api/parking-spots/:id', async (req, res) => {
    try {
      let spot = await storage.getParkingSpot(req.params.id);
      if (!spot) {
        return res.status(404).json({ message: "Parking spot not found" });
      }
      // Lazy-apply pending changes if the scheduled time has passed
      if (spot.pendingChanges && spot.pendingChangesFrom && new Date(spot.pendingChangesFrom) <= new Date()) {
        const updated = await storage.applyAndClearPendingChanges(req.params.id);
        if (updated) spot = updated;
      }
      res.json(safeSpot(spot));
    } catch (error) {
      console.error("Error fetching parking spot:", error);
      res.status(500).json({ message: "Failed to fetch parking spot" });
    }
  });

  // ─── Ramp / barrier control ───────────────────────────────────────────────

  // In-memory rate limit: bookingId → last trigger timestamp
  const rampCooldowns = new Map<string, number>();
  const RAMP_COOLDOWN_MS = 30 * 1000; // 30 seconds

  // In-memory queue for Tasker polling
  interface RampTrigger { phone: string; spotTitle: string; triggeredAt: number; }
  const rampPendingQueue: RampTrigger[] = [];
  const RAMP_TRIGGER_TTL_MS = 60_000; // triggers expire after 60s

  // GET /api/ramp-poll?key=NTFY_TOPIC — Tasker polls this every 5s
  app.get('/api/ramp-poll', (req: any, res) => {
    const key = (req.query.key as string) ?? '';
    const ntfyTopic = process.env.NTFY_TOPIC ?? '';
    if (!ntfyTopic || key !== ntfyTopic) {
      return res.status(401).json({ phone: null });
    }
    const now = Date.now();
    // Remove expired triggers
    while (rampPendingQueue.length && now - rampPendingQueue[0].triggeredAt > RAMP_TRIGGER_TTL_MS) {
      rampPendingQueue.shift();
    }
    if (rampPendingQueue.length > 0) {
      const trigger = rampPendingQueue.shift()!;
      console.log(`[RampPoll] Dispatching trigger: ${trigger.spotTitle} → ${trigger.phone}`);
      return res.json({ phone: trigger.phone, spotTitle: trigger.spotTitle });
    }
    res.json({ phone: null });
  });

  // Helper: find an active booking for this user + spot within ±10 min window
  async function getActiveRampBooking(userId: string, spotId: string) {
    const now = new Date();
    const windowStart = new Date(now.getTime() - 10 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 10 * 60 * 1000);
    const results = await db
      .select()
      .from(bookings)
      .where(
        sql`${bookings.spotId} = ${spotId}
          AND ${bookings.renterId} = ${userId}
          AND ${bookings.status} = 'confirmed'
          AND ${bookings.startTime} <= ${windowEnd.toISOString()}
          AND ${bookings.endTime} >= ${windowStart.toISOString()}`
      )
      .limit(1);
    return results[0] ?? null;
  }

  // Helper: trigger MacroDroid webhook (primary ramp mechanism)
  // Uses per-spot webhookUrl if provided, falls back to global MACRODROID_WEBHOOK_URL env var
  async function sendMacroDroid(rampPhone: string, spotTitle: string, spotWebhookUrl?: string | null): Promise<boolean> {
    const webhookUrl = spotWebhookUrl || process.env.MACRODROID_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("[Ramp] No webhook URL configured (neither per-spot nor global MACRODROID_WEBHOOK_URL)");
      return false;
    }
    try {
      const url = new URL(webhookUrl);
      url.searchParams.set("phone", rampPhone);
      url.searchParams.set("spot", spotTitle);
      url.searchParams.set("t", Date.now().toString()); // unique per request, prevents deduplication
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const resp = await fetch(url.toString(), { method: "GET", signal: controller.signal });
      clearTimeout(timer);
      console.log(`[Ramp] MacroDroid webhook → ${resp.status} for ${spotTitle}`);
      return resp.ok;
    } catch (err) {
      console.error("[Ramp] MacroDroid webhook error:", err);
      return false;
    }
  }

  // Helper: send ntfy notification (visual backup only)
  async function sendRampNtfy(rampPhone: string, spotTitle: string): Promise<boolean> {
    const ntfyTopic = process.env.NTFY_TOPIC;
    if (!ntfyTopic) return false;
    try {
      const resp = await fetch(`https://ntfy.sh/${ntfyTopic}`, {
        method: "POST",
        headers: {
          "Title": rampPhone,
          "Priority": "urgent",
          "Tags": "parking_ramp",
          "Content-Type": "text/plain",
        },
        body: spotTitle,
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  // GET /api/parking-spots/:id/ramp-status — can the current user open the ramp?
  app.get('/api/parking-spots/:id/ramp-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const spot = await storage.getParkingSpot(req.params.id);
      if (!spot) return res.status(404).json({ message: "Parking spot not found" });
      if (!spot.hasRamp) return res.json({ canOpen: false, reason: "no_ramp" });

      const booking = await getActiveRampBooking(userId, req.params.id);
      if (!booking) return res.json({ canOpen: false, reason: "no_active_booking" });

      const lastAt = rampCooldowns.get(booking.id) ?? 0;
      const cooldownLeft = Math.max(0, RAMP_COOLDOWN_MS - (Date.now() - lastAt));

      res.json({ canOpen: cooldownLeft === 0, cooldownLeft, bookingId: booking.id });
    } catch (error) {
      console.error("Error checking ramp status:", error);
      res.status(500).json({ message: "Greška pri proveri rampe" });
    }
  });

  // POST /api/parking-spots/:id/open-ramp — trigger the ramp via ntfy.sh
  app.post('/api/parking-spots/:id/open-ramp', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const spot = await storage.getParkingSpot(req.params.id);
      if (!spot) return res.status(404).json({ message: "Parking spot not found" });
      if (!spot.hasRamp) return res.status(400).json({ message: "Ovo parking mesto nema rampu" });
      if (!spot.rampPhone) return res.status(503).json({ message: "Broj rampe nije konfigurisan" });

      // Check if user is admin — admins can test-trigger without a booking window
      const user = await storage.getUser(userId);
      const isAdminUser = user?.isAdmin || ADMIN_EMAIL_LIST.includes(user?.email || '');

      if (!isAdminUser) {
        const booking = await getActiveRampBooking(userId, req.params.id);
        if (!booking) return res.status(403).json({ message: "Nemate aktivnu rezervaciju za ovo mesto" });

        const lastAt = rampCooldowns.get(booking.id) ?? 0;
        if (Date.now() - lastAt < RAMP_COOLDOWN_MS) {
          const secsLeft = Math.ceil((RAMP_COOLDOWN_MS - (Date.now() - lastAt)) / 1000);
          return res.status(429).json({ message: `Pričekajte još ${secsLeft}s pre sledećeg zahteva` });
        }

        // Primary: MacroDroid webhook — per-spot URL, falls back to global env var
        const macroOk = await sendMacroDroid(spot.rampPhone, spot.title, spot.rampWebhookUrl);
        if (!macroOk) {
          console.warn(`[Ramp] MacroDroid webhook failed for booking ${booking.id}`);
        }

        // Backup: ntfy visual notification
        sendRampNtfy(spot.rampPhone, spot.title).catch(() => {});

        rampCooldowns.set(booking.id, Date.now());
      } else {
        // Admin test trigger — no booking required, no cooldown
        const macroOk = await sendMacroDroid(spot.rampPhone, `[TEST] ${spot.title}`, spot.rampWebhookUrl);
        if (!macroOk) {
          console.warn(`[Ramp] MacroDroid webhook failed for admin test`);
        }

        // Backup: ntfy visual notification
        sendRampNtfy(spot.rampPhone, `[TEST] ${spot.title}`).catch(() => {});
      }

      res.json({ ok: true });
    } catch (error) {
      console.error("Error opening ramp:", error);
      res.status(500).json({ message: "Greška pri otvaranju rampe" });
    }
  });

  // Get availability (booked periods) for a spot — public endpoint
  // ?space=N filters to a specific space number (for multi-space spots)
  app.get('/api/spots/:id/availability', async (req, res) => {
    try {
      const spotBookings = await storage.getSpotBookings(req.params.id);
      const spaceParam = req.query.space ? parseInt(String(req.query.space), 10) : null;
      const active = spotBookings
        .filter(b => {
          if (b.status === 'cancelled' || b.paymentStatus !== 'paid') return false;
          if (spaceParam !== null && !isNaN(spaceParam)) return b.spaceNumber === spaceParam;
          return true;
        })
        .map(b => ({ startTime: b.startTime, endTime: b.endTime }));
      res.json(active);
    } catch (error) {
      console.error("Error fetching availability:", error);
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // Get bookings received by the owner (for all spots they own)
  app.get('/api/bookings/owner-received', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const fromParam = req.query.from ? new Date(req.query.from as string) : undefined;
      const toParam = req.query.to ? new Date(req.query.to as string) : undefined;
      const from = fromParam && !isNaN(fromParam.getTime()) ? fromParam : undefined;
      const to = toParam && !isNaN(toParam.getTime()) ? toParam : undefined;
      const bookingList = await storage.getOwnerReceivedBookings(userId, from, to);
      res.json(bookingList);
    } catch (error) {
      console.error("Error fetching owner-received bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
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
      const basePrice = getPlanBasePrice(category, tier);
      if (!basePrice) {
        return res.status(404).json({ message: "Price not found for this category and tier" });
      }
      const totalAmountParas = Math.round(totalWithFee(basePrice) * 100);

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
        line_items: [{
          price_data: {
            currency: 'rsd',
            product_data: { name: `CarDrop - ${tier === 'gold' ? 'Gold' : 'Silver'} Plan` },
            unit_amount: totalAmountParas,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&spot_id=${spot.id}`,
        cancel_url: `${baseUrl}/checkout/cancel?spot_id=${spot.id}`,
        metadata: {
          type: 'spot_listing',
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
      const basePrice = getPlanBasePrice(category, tier);
      if (!basePrice) {
        return res.status(404).json({ message: "Price not found for this category and tier" });
      }
      const totalAmountParas = Math.round(totalWithFee(basePrice) * 100);

      const baseUrl = `${req.protocol}://${req.get('host')}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'rsd',
            product_data: { name: `CarDrop - ${tier === 'gold' ? 'Gold' : 'Silver'} Plan` },
            unit_amount: totalAmountParas,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&spot_id=${spot.id}`,
        cancel_url: `${baseUrl}/add-spot?category=${category}`,
        metadata: {
          type: 'spot_listing',
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

  app.get('/api/stripe/session-type', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { session_id } = req.query;
      if (!session_id || typeof session_id !== 'string') {
        return res.status(400).json({ message: "Nedostaje session_id" });
      }
      const session = await stripe.checkout.sessions.retrieve(session_id);
      const meta = session.metadata || {};
      let type: string = meta.type || 'unknown';
      if (type === 'unknown') {
        if (meta.listingId) type = 'sale_listing';
        else if (meta.spotId && meta.renterId) type = 'booking';
        else if (meta.spotId) type = 'spot_listing';
        else if (meta.plan) type = 'map_hack';
      }
      return res.json({
        type,
        spotId: meta.spotId || null,
        listingId: meta.listingId || null,
      });
    } catch (error: any) {
      console.error("Error fetching session type:", error);
      res.status(500).json({ message: "Greška pri dohvatanju sesije" });
    }
  });

  app.post('/api/stripe/create-booking-checkout', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId;
      const { spotId, startTime, endTime } = req.body;
      const rawPlate: unknown = req.body.licensePlate;
      const licensePlate: string = typeof rawPlate === 'string'
        ? rawPlate.trim().toUpperCase().slice(0, 30)
        : '';
      const rawPhone: unknown = req.body.renterPhone;
      const renterPhone: string = typeof rawPhone === 'string'
        ? rawPhone.trim().slice(0, 30)
        : '';
      const rawSpace: unknown = req.body.spaceNumber;
      const spaceNumber: number = typeof rawSpace === 'number' ? rawSpace : (typeof rawSpace === 'string' ? parseInt(rawSpace, 10) : 1);

      if (!spotId || !startTime || !endTime) {
        return res.status(400).json({ message: "Nedostaju obavezna polja: spotId, startTime, endTime" });
      }
      if (!renterPhone) {
        return res.status(400).json({ message: "Broj telefona je obavezan" });
      }

      const spot = await storage.getParkingSpot(spotId);
      if (!spot || !spot.isActive) {
        return res.status(404).json({ message: "Parking ne postoji ili nije aktivan" });
      }
      if (!spot.stripeLinkActive) {
        return res.status(403).json({ message: "Online plaćanje nije aktivno za ovaj parking" });
      }

      const start = new Date(startTime);
      const end = new Date(endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
        return res.status(400).json({ message: "Nevalidni datumi" });
      }

      // Server-side overlap check — prevent double-booking (per space if multi-space)
      const validSpaceNumber = (!isNaN(spaceNumber) && spaceNumber >= 1) ? spaceNumber : 1;
      const overlaps = await storage.hasBookingOverlap(spotId, start, end, undefined, validSpaceNumber);
      if (overlaps) {
        return res.status(409).json({ message: "Izabrani termin je već rezervisan. Molimo izaberite drugi datum ili vreme." });
      }

      const reqPricingType: string = typeof req.body.pricingType === 'string' ? req.body.pricingType : (spot.pricingType || 'daily');
      // Server-side validation: reject pricingType if that price column is null/zero for this spot
      const allowedTypes: Record<string, number | null> = {
        hourly: spot.pricePerHour ? parseFloat(String(spot.pricePerHour)) : null,
        daily: spot.pricePerDay ? parseFloat(String(spot.pricePerDay)) : null,
        weekly: spot.pricePerWeek ? parseFloat(String(spot.pricePerWeek)) : null,
        monthly: spot.pricePerMonth ? parseFloat(String(spot.pricePerMonth)) : null,
      };
      // Legacy fallback: if all new columns null, fall back to pricePerHour for the legacy pricingType
      const hasAnyNewPrice = Object.values(allowedTypes).some(p => p && p > 0);
      if (!hasAnyNewPrice) {
        allowedTypes[spot.pricingType || 'daily'] = parseFloat(String(spot.pricePerHour)) || null;
      }
      const priceForType = allowedTypes[reqPricingType];
      if (!priceForType || priceForType <= 0) {
        return res.status(400).json({ message: `Tip cene '${reqPricingType}' nije dostupan za ovaj parking` });
      }
      const pricePerUnit: number = priceForType;
      let totalPrice: number;
      if (reqPricingType === 'hourly') {
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        totalPrice = Math.round(pricePerUnit * hours * 100) / 100;
      } else if (reqPricingType === 'monthly') {
        const months = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
        totalPrice = pricePerUnit * Math.max(1, months);
      } else if (reqPricingType === 'weekly') {
        const weeks = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
        totalPrice = pricePerUnit * Math.max(1, weeks);
      } else {
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        totalPrice = pricePerUnit * Math.max(1, days);
      }
      if (totalPrice <= 0) {
        return res.status(400).json({ message: "Ukupna cena mora biti veća od 0" });
      }

      const currentUser = await storage.getUser(userId);
      if (!currentUser) return res.status(404).json({ message: "Korisnik nije pronađen" });

      let stripeCustomerId = currentUser.stripeCustomerId ?? undefined;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: currentUser.email ?? undefined,
          name: `${currentUser.firstName ?? ''} ${currentUser.lastName ?? ''}`.trim() || undefined,
          metadata: { userId },
        });
        stripeCustomerId = customer.id;
        await storage.updateUser(userId, { stripeCustomerId });
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const currency = (spot.currency || 'RSD').toLowerCase();
      const stripeFeeRsd = Math.round(totalPrice * 0.039 + 35);
      const amountInSmallestUnit = Math.round((totalPrice + stripeFeeRsd) * 100);

      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency,
            product_data: {
              name: spot.parkingNumber
                ? `Parking ${spot.parkingNumber} — ${spot.title}`
                : `Parking: ${spot.title}`,
              description: `${start.toLocaleDateString('sr-Latn-RS')} – ${end.toLocaleDateString('sr-Latn-RS')}`,
            },
            unit_amount: amountInSmallestUnit,
          },
          quantity: 1,
        }],
        mode: 'payment',
        payment_intent_data: {
          setup_future_usage: 'off_session',
        },
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&booking=1`,
        cancel_url: `${baseUrl}/map-hack`,
        metadata: {
          type: 'booking',
          spotId,
          renterId: userId,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          licensePlate: licensePlate || '',
          renterPhone: renterPhone || '',
          spaceNumber: String(validSpaceNumber),
          totalPrice: String(totalPrice),
          currency: spot.currency,
          pricingType: reqPricingType,
        },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error("Error creating booking checkout:", error);
      res.status(500).json({ message: error?.message || "Greška pri kreiranju sesije" });
    }
  });

  app.post('/api/stripe/verify-booking-payment', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const { sessionId } = req.body;
      const userId = req.session.userId;

      if (!sessionId) {
        return res.status(400).json({ message: "Nedostaje sessionId" });
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return res.status(400).json({ message: "Plaćanje nije završeno", status: session.payment_status });
      }
      if (session.metadata?.renterId !== String(userId)) {
        return res.status(403).json({ message: "Neovlašćen pristup" });
      }
      if (session.metadata?.type !== 'booking') {
        return res.status(400).json({ message: "Nevalidna sesija" });
      }

      const spotId = session.metadata?.spotId;
      const startTime = session.metadata?.startTime;
      const endTime = session.metadata?.endTime;
      const licensePlate = session.metadata?.licensePlate || '';
      const renterPhone = session.metadata?.renterPhone || '';
      const spaceNumberMeta = session.metadata?.spaceNumber ? parseInt(session.metadata.spaceNumber, 10) : 1;
      const validSpaceNumberVerify = (!isNaN(spaceNumberMeta) && spaceNumberMeta >= 1) ? spaceNumberMeta : 1;
      const totalPrice = session.metadata?.totalPrice;
      const currency = session.metadata?.currency || 'RSD';

      if (!spotId || !startTime || !endTime || !totalPrice) {
        return res.status(400).json({ message: "Nevalidni podaci sesije" });
      }

      const spot = await storage.getParkingSpot(spotId);
      if (!spot) return res.status(404).json({ message: "Parking nije pronađen" });

      // Final overlap check at booking finalization — guards against concurrent checkouts (per space)
      const finalOverlap = await storage.hasBookingOverlap(spotId, new Date(startTime), new Date(endTime), sessionId, validSpaceNumberVerify);
      if (finalOverlap) {
        return res.status(409).json({ message: "Ovaj termin je u međuvremenu rezervisan. Molimo pokušajte ponovo sa drugim terminom." });
      }

      const sessionPricingType = (session.metadata?.pricingType as string) || 'daily';
      const approvalToken = randomBytes(32).toString('hex');

      const { booking, alreadyConsumed } = await storage.createBookingWithSession({
        spotId,
        renterId: userId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        totalPrice,
        currency,
        status: 'pending_approval',
        paymentStatus: 'paid',
        licensePlate: licensePlate || undefined,
        renterPhone: renterPhone || undefined,
        spaceNumber: validSpaceNumberVerify,
        bookingStripeSessionId: sessionId,
        pricingType: sessionPricingType,
        approvalToken,
      });

      if (licensePlate) {
        await storage.saveUserLicensePlate(userId, licensePlate);
      }

      if (alreadyConsumed) {
        return res.json({ success: true, booking, alreadyConsumed: true, spot });
      }

      // Push notifikacija vlasniku
      const startLabel = new Date(startTime).toLocaleDateString('sr-Latn-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
      sendPushToUser(spot.ownerId, {
        title: "Nova rezervacija ceka odobrenje",
        body: `${spot.title} — ${startLabel}`,
        icon: '/icons/icon-192x192.png',
        tag: `booking-${booking.id}`,
        url: '/dashboard',
      }).catch(() => {});

      // Email vlasniku sa dugmicima Odobri/Odbij
      (async () => {
        try {
          const [owner, renter] = await Promise.all([
            storage.getUser(spot.ownerId),
            storage.getUser(userId),
          ]);
          const baseUrl = process.env.APP_URL || 'https://cardrop.app';
          const approveUrl = `${baseUrl}/api/bookings/approve/${booking.approvalToken}`;
          const rejectUrl = `${baseUrl}/api/bookings/reject/${booking.approvalToken}`;
          if (owner?.email) {
            await sendBookingOwnerEmail({
              ownerEmail: owner.email,
              ownerName: owner.firstName || owner.email,
              spotTitle: spot.title,
              spotAddress: spot.address,
              renterName: renter ? `${renter.firstName || ''} ${renter.lastName || ''}`.trim() || renter.email : 'Nepoznat',
              licensePlate: booking.licensePlate || undefined,
              renterPhone: booking.renterPhone || undefined,
              startTime: new Date(booking.startTime),
              endTime: new Date(booking.endTime),
              totalPrice: booking.totalPrice,
              currency: booking.currency || 'RSD',
              approveUrl,
              rejectUrl,
            });
          }
        } catch (emailErr) {
          console.error('[EMAIL] Greška pri slanju email notifikacija:', emailErr);
        }
      })();

      res.json({ success: true, booking, spot });
    } catch (error: any) {
      console.error("Error verifying booking payment:", error);
      res.status(500).json({ message: "Greška pri verifikaciji plaćanja" });
    }
  });

  // ── BOOKING APPROVE / REJECT (token links from owner email) ──
  function approvalPage(status: 'approved' | 'rejected' | 'already' | 'invalid'): string {
    const configs: Record<string, { color: string; bg: string; title: string; msg: string }> = {
      approved: { color: '#1b4332', bg: '#f0fdf4', title: 'Rezervacija odobrena!', msg: 'Zakupac je obavestен. Rezervacija je aktivna.' },
      rejected: { color: '#991b1b', bg: '#fef2f2', title: 'Rezervacija odbijena', msg: 'Zakupac je obavestен da rezervacija nije prihvacena.' },
      already:  { color: '#92400e', bg: '#fffbeb', title: 'Vec obradeno', msg: 'Ova rezervacija je vec odobrena ili odbijena.' },
      invalid:  { color: '#6b7280', bg: '#f9fafb', title: 'Nevazeci link', msg: 'Link nije validan ili je istekao.' },
    };
    const c = configs[status];
    return `<!DOCTYPE html><html lang="sr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>CarDrop</title></head>
<body style="margin:0;padding:40px 16px;background:#f4f4f4;font-family:Arial,sans-serif;text-align:center;">
  <div style="max-width:440px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.1);">
    <div style="background:#1b4332;padding:20px 24px;">
      <h1 style="margin:0;color:#40916c;font-size:26px;letter-spacing:1px;">CarDrop</h1>
    </div>
    <div style="padding:36px 32px;background:${c.bg};">
      <p style="margin:0 0 8px;font-size:22px;font-weight:bold;color:${c.color};">${c.title}</p>
      <p style="margin:0 0 28px;color:#555;font-size:15px;">${c.msg}</p>
      <a href="https://cardrop.app/dashboard" style="display:inline-block;background:#40916c;color:#fff;text-decoration:none;padding:11px 28px;border-radius:6px;font-weight:bold;font-size:15px;">Otvori Dashboard</a>
    </div>
  </div>
</body></html>`;
  }

  app.get('/api/bookings/approve/:token', async (req: any, res) => {
    const { token } = req.params;
    try {
      const booking = await storage.resolveBookingApproval(token, true);
      if (!booking) {
        const existing = await storage.getBookingByApprovalToken(token);
        return res.send(approvalPage(existing ? 'already' : 'invalid'));
      }
      const [spot, renter] = await Promise.all([
        storage.getParkingSpot(booking.spotId),
        storage.getUser(booking.renterId),
      ]);
      if (renter?.email && spot) {
        sendBookingApprovedEmail({
          renterEmail: renter.email,
          renterName: renter.firstName || renter.email,
          spotTitle: spot.title,
          spotAddress: spot.address,
          ownerPhone: spot.phone || undefined,
          startTime: new Date(booking.startTime),
          endTime: new Date(booking.endTime),
          totalPrice: booking.totalPrice,
          currency: booking.currency || 'RSD',
        }).catch(() => {});
      }
      return res.send(approvalPage('approved'));
    } catch (err) {
      console.error('[APPROVE]', err);
      return res.status(500).send(approvalPage('invalid'));
    }
  });

  app.get('/api/bookings/reject/:token', async (req: any, res) => {
    const { token } = req.params;
    try {
      const booking = await storage.resolveBookingApproval(token, false);
      if (!booking) {
        const existing = await storage.getBookingByApprovalToken(token);
        return res.send(approvalPage(existing ? 'already' : 'invalid'));
      }
      const [spot, renter] = await Promise.all([
        storage.getParkingSpot(booking.spotId),
        storage.getUser(booking.renterId),
      ]);
      if (renter?.email && spot) {
        sendBookingRejectedEmail({
          renterEmail: renter.email,
          renterName: renter.firstName || renter.email,
          spotTitle: spot.title,
          startTime: new Date(booking.startTime),
          endTime: new Date(booking.endTime),
          totalPrice: booking.totalPrice,
          currency: booking.currency || 'RSD',
          paymentMethod: booking.paymentMethod || undefined,
        }).catch(() => {});
      }
      return res.send(approvalPage('rejected'));
    } catch (err) {
      console.error('[REJECT]', err);
      return res.status(500).send(approvalPage('invalid'));
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

      const salePriceBase = getPlanBasePrice('sale', tier);
      if (!salePriceBase) {
        return res.status(404).json({ message: "Price not found for this tier" });
      }
      const saleAmountParas = Math.round(totalWithFee(salePriceBase) * 100);

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
        line_items: [{
          price_data: {
            currency: 'rsd',
            product_data: { name: `CarDrop - ${tier === 'gold' ? 'Gold' : 'Silver'} Plan` },
            unit_amount: saleAmountParas,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&listing_id=${listing.id}`,
        cancel_url: `${baseUrl}/checkout/cancel?listing_id=${listing.id}`,
        metadata: {
          type: 'sale_listing',
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
      const parkingNumber = await generateParkingNumber(validatedData.city);
      const spot = await storage.createParkingSpot({
        ...validatedData,
        category: category || 'private',
        ownerId: userId,
        subscriptionType: plan.id,
        subscriptionExpiresAt: isPremiumPlan ? null : subscriptionExpiresAt,
        isPremium: isPremiumPlan,
        isActive: !isPremiumPlan,
        parkingNumber,
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
      const bookingList = await storage.getUserBookings(userId);
      const enriched = await Promise.all(
        bookingList.map(async (b) => {
          const spot = await storage.getParkingSpot(b.spotId);
          return { ...b, spotTitle: spot?.title ?? null, spotAddress: spot?.address ?? null, spotPhone: spot?.phone ?? null, spotHasRamp: spot?.hasRamp ?? false };
        })
      );
      res.json(enriched);
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
      const rawPlateC: unknown = req.body.licensePlate;
      const licensePlateC: string = typeof rawPlateC === 'string' ? rawPlateC.trim().toUpperCase().slice(0, 30) : '';
      const rawPhoneC: unknown = req.body.renterPhone;
      const renterPhoneC: string = typeof rawPhoneC === 'string' ? rawPhoneC.trim().slice(0, 30) : '';
      const rawSpaceC: unknown = req.body.spaceNumber;
      const spaceNumberC: number = typeof rawSpaceC === 'number' ? rawSpaceC : (typeof rawSpaceC === 'string' ? parseInt(rawSpaceC, 10) : 1);
      const validSpaceC = (!isNaN(spaceNumberC) && spaceNumberC >= 1) ? spaceNumberC : 1;

      if (!renterPhoneC) {
        return res.status(400).json({ message: "Broj telefona je obavezan" });
      }

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

      // Determine pricing type from request body, validated against spot's offered types
      const reqPricingTypeC: string = typeof req.body.pricingType === 'string' ? req.body.pricingType : (spot.pricingType || 'daily');
      const allowedTypesC: Record<string, number | null> = {
        hourly: spot.pricePerHour ? parseFloat(String(spot.pricePerHour)) : null,
        daily: spot.pricePerDay ? parseFloat(String(spot.pricePerDay)) : null,
        weekly: spot.pricePerWeek ? parseFloat(String(spot.pricePerWeek)) : null,
        monthly: spot.pricePerMonth ? parseFloat(String(spot.pricePerMonth)) : null,
      };
      const hasAnyNewPriceC = Object.values(allowedTypesC).some(p => p && p > 0);
      if (!hasAnyNewPriceC) {
        allowedTypesC[spot.pricingType || 'daily'] = parseFloat(String(spot.pricePerHour)) || null;
      }
      const priceForTypeC = allowedTypesC[reqPricingTypeC];
      if (!priceForTypeC || priceForTypeC <= 0) {
        return res.status(400).json({ message: `Tip cene '${reqPricingTypeC}' nije dostupan za ovaj parking` });
      }
      // Compute total price server-side based on selected pricing type
      let totalPrice: string;
      if (reqPricingTypeC === 'hourly') {
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        totalPrice = (Math.round(priceForTypeC * hours * 100) / 100).toFixed(2);
      } else if (reqPricingTypeC === 'weekly') {
        const weeks = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24 * 7));
        totalPrice = (priceForTypeC * Math.max(1, weeks)).toFixed(2);
      } else if (reqPricingTypeC === 'monthly') {
        const months = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24 * 30));
        totalPrice = (priceForTypeC * Math.max(1, months)).toFixed(2);
      } else {
        const days = Math.ceil((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24));
        totalPrice = (priceForTypeC * Math.max(1, days)).toFixed(2);
      }
      if (parseFloat(totalPrice) <= 0) {
        return res.status(400).json({ message: "Ukupna cena mora biti veća od 0" });
      }

      // Check for conflicting bookings (per space); if conflict, try next free space
      let finalSpaceC = validSpaceC;
      const hasConflict = await storage.hasBookingOverlap(spotId, startTime, endTime, undefined, validSpaceC);

      if (hasConflict) {
        const totalSpaces = spot.totalSpaces || 1;
        if (totalSpaces <= 1) {
          return res.status(400).json({ message: "Izabrani termin je već rezervisan za to parking mesto." });
        }
        let foundSpace: number | null = null;
        for (let s = 1; s <= totalSpaces; s++) {
          if (s === validSpaceC) continue;
          const conflict = await storage.hasBookingOverlap(spotId, startTime, endTime, undefined, s);
          if (!conflict) { foundSpace = s; break; }
        }
        if (foundSpace === null) {
          return res.status(400).json({ message: "Sva parking mesta su zauzeta za izabrani termin." });
        }
        finalSpaceC = foundSpace;
      }

      const reqPaymentMethod: string = typeof req.body.paymentMethod === 'string' ? req.body.paymentMethod : '';

      // Credit payment — check balance, create pending_approval booking, deduct only after owner approves
      if (reqPaymentMethod === 'credit') {
        if (!spot.stripeLinkActive) {
          return res.status(403).json({ message: "Online plaćanje nije aktivno za ovaj parking" });
        }
        const amountRsd = Math.round(parseFloat(totalPrice));
        try {
          const approvalToken = randomBytes(32).toString('hex');
          const creditBooking = await storage.createBookingWithCredit({
            spotId, startTime, endTime, totalPrice, currency: spot.currency,
            status: 'pending_approval', paymentStatus: 'pending', renterId: userId,
            licensePlate: licensePlateC || undefined, renterPhone: renterPhoneC || undefined,
            spaceNumber: finalSpaceC, pricingType: reqPricingTypeC,
            approvalToken,
          }, amountRsd);
          if (licensePlateC) await storage.saveUserLicensePlate(userId, licensePlateC);
          const baseUrl = process.env.APP_URL || 'https://cardrop.app';
          const approveUrl = `${baseUrl}/api/bookings/approve/${approvalToken}`;
          const rejectUrl = `${baseUrl}/api/bookings/reject/${approvalToken}`;
          // Email notifikacije za kreditnu rezervaciju (vlasnik + zakupac)
          (async () => {
            try {
              const [owner, renter] = await Promise.all([
                storage.getUser(spot.ownerId),
                storage.getUser(userId),
              ]);
              if (owner?.email) {
                await sendBookingOwnerEmail({
                  ownerEmail: owner.email,
                  ownerName: owner.firstName || owner.email,
                  spotTitle: spot.title,
                  spotAddress: spot.address,
                  renterName: renter ? `${renter.firstName || ''} ${renter.lastName || ''}`.trim() || renter.email : 'Nepoznat',
                  licensePlate: creditBooking.licensePlate || undefined,
                  renterPhone: creditBooking.renterPhone || undefined,
                  startTime: new Date(creditBooking.startTime),
                  endTime: new Date(creditBooking.endTime),
                  totalPrice: creditBooking.totalPrice,
                  currency: creditBooking.currency || 'RSD',
                  approveUrl,
                  rejectUrl,
                });
              }
              if (renter?.email) {
                await sendBookingPendingApprovalEmail({
                  renterEmail: renter.email,
                  renterName: renter.firstName || renter.email,
                  spotTitle: spot.title,
                  spotAddress: spot.address,
                  startTime: new Date(creditBooking.startTime),
                  endTime: new Date(creditBooking.endTime),
                  totalPrice: creditBooking.totalPrice,
                  currency: creditBooking.currency || 'RSD',
                });
              }
            } catch (emailErr) {
              console.error('[EMAIL] Greška pri slanju email notifikacija za kreditnu rezervaciju:', emailErr);
            }
          })();
          const creditResponse = finalSpaceC !== validSpaceC ? { ...creditBooking, autoAssignedSpace: finalSpaceC } : creditBooking;
          return res.status(201).json(creditResponse);
        } catch (creditErr: any) {
          if (creditErr?.code === 'INSUFFICIENT_CREDIT') {
            return res.status(402).json({ message: `Nedovoljan balans. Imate ${creditErr.balance} RSD kredita, a potrebno je ${amountRsd} RSD.`, code: 'INSUFFICIENT_CREDIT', balance: creditErr.balance });
          }
          throw creditErr;
        }
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
        licensePlate: licensePlateC || undefined,
        renterPhone: renterPhoneC || undefined,
        spaceNumber: finalSpaceC,
        pricingType: reqPricingTypeC,
      });

      // Email notifikacije (vlasnik + zakupac) — gotovina/prenos
      (async () => {
        try {
          const [owner, renter] = await Promise.all([
            storage.getUser(spot.ownerId),
            storage.getUser(userId),
          ]);
          if (owner?.email) {
            await sendBookingOwnerEmail({
              ownerEmail: owner.email,
              ownerName: owner.firstName || owner.email,
              spotTitle: spot.title,
              spotAddress: spot.address,
              renterName: renter ? `${renter.firstName || ''} ${renter.lastName || ''}`.trim() || renter.email : 'Nepoznat',
              licensePlate: booking.licensePlate || undefined,
              renterPhone: booking.renterPhone || undefined,
              startTime: new Date(booking.startTime),
              endTime: new Date(booking.endTime),
              totalPrice: booking.totalPrice,
              currency: booking.currency || 'RSD',
            });
          }
          if (renter?.email) {
            await sendBookingRenterConfirmationEmail({
              renterEmail: renter.email,
              renterName: renter.firstName || renter.email,
              spotTitle: spot.title,
              spotAddress: spot.address,
              ownerPhone: spot.phone || undefined,
              startTime: new Date(booking.startTime),
              endTime: new Date(booking.endTime),
              totalPrice: booking.totalPrice,
              currency: booking.currency || 'RSD',
            });
          }
        } catch (emailErr) {
          console.error('[EMAIL] Greška pri slanju email notifikacija:', emailErr);
        }
      })();

      const cashResponse = finalSpaceC !== validSpaceC ? { ...booking, autoAssignedSpace: finalSpaceC } : booking;
      res.status(201).json(cashResponse);
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

      const currentUser = await storage.getUser(userId);
      const isAdminUser = currentUser?.isAdmin || ADMIN_EMAIL_LIST.includes(currentUser?.email || '');
      if (spot.ownerId !== userId && !isAdminUser) {
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

      const currentUser = await storage.getUser(userId);
      const isAdminUser = currentUser?.isAdmin || ADMIN_EMAIL_LIST.includes(currentUser?.email || '');
      if (spot.ownerId !== userId && !isAdminUser) {
        return res.status(403).json({ error: "Not authorized" });
      }

      // Verify the imageUrl actually belongs to this spot before any deletion
      if (!spot.imageUrls.includes(imageUrl)) {
        return res.status(400).json({ error: "Image not associated with this spot" });
      }

      const updatedImages = spot.imageUrls.filter((url: string) => url !== imageUrl);

      // Best-effort: delete the actual object from Object Storage
      try {
        const objectStorageService = new ObjectStorageService();
        const file = await objectStorageService.getObjectEntityFile(imageUrl);
        await file.delete();
      } catch (storageErr) {
        // Non-fatal: log but continue — DB update still removes the URL reference
        console.warn("Could not delete object from storage (may already be gone):", storageErr);
      }

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

      // Calculate next midnight UTC+1 (23:00 UTC)
      const now = new Date();
      const nextMidnight = new Date();
      nextMidnight.setUTCHours(23, 0, 0, 0);
      if (now.getUTCHours() >= 23) {
        nextMidnight.setUTCDate(nextMidnight.getUTCDate() + 1);
      }

      const updated = await storage.setPendingChanges(req.params.id, validatedData as Record<string, unknown>, nextMidnight);
      res.json({ ...updated, pendingUntil: nextMidnight.toISOString() });
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
    const existing = allSpots
      .map(s => s.parkingNumber)
      .filter((n): n is string => !!n && n.startsWith(abbrev))
      .map(n => parseInt(n.slice(abbrev.length), 10))
      .filter(n => !isNaN(n));
    const maxN = existing.length > 0 ? Math.max(...existing) : 0;
    // Find first unused number >= maxN+1 to handle gaps
    const usedSet = new Set(existing);
    let candidate = maxN + 1;
    while (usedSet.has(candidate)) candidate++;
    return `${abbrev}${candidate}`;
  }

  app.get('/api/admin/parking-spots', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const spots = await storage.getAllParkingSpotsAdmin();
      res.json(spots.map(safeSpot));
    } catch (error) {
      console.error("Error fetching all parking spots:", error);
      res.status(500).json({ message: "Failed to fetch parking spots" });
    }
  });

  // Admin-only: get ramp config for a specific spot (includes rampPhone + rampWebhookUrl)
  app.get('/api/admin/parking-spots/:id/ramp-config', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const spot = await storage.getParkingSpot(req.params.id);
      if (!spot) return res.status(404).json({ message: "Parking spot not found" });
      res.json({ hasRamp: spot.hasRamp, rampPhone: spot.rampPhone ?? "", rampWebhookUrl: spot.rampWebhookUrl ?? "" });
    } catch (error) {
      console.error("Error fetching ramp config:", error);
      res.status(500).json({ message: "Greška pri učitavanju konfiguracije rampe" });
    }
  });

  // Admin-only: set ramp config for a spot
  app.patch('/api/admin/parking-spots/:id/set-ramp', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { hasRamp, rampPhone, rampWebhookUrl } = req.body;
      if (typeof hasRamp !== 'boolean') return res.status(400).json({ message: "hasRamp mora biti boolean" });
      const phone = hasRamp ? (rampPhone ?? "").trim() : null;
      const webhookUrl = hasRamp ? (rampWebhookUrl ?? "").trim() || null : null;
      const spot = await storage.updateParkingSpot(req.params.id, { hasRamp, rampPhone: phone, rampWebhookUrl: webhookUrl } as any);
      if (!spot) return res.status(404).json({ message: "Parking spot not found" });
      res.json({ hasRamp: spot.hasRamp, rampPhone: spot.rampPhone ?? "", rampWebhookUrl: spot.rampWebhookUrl ?? "" });
    } catch (error) {
      console.error("Error setting ramp config:", error);
      res.status(500).json({ message: "Greška pri podešavanju rampe" });
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
        pricePerHour: body.pricePerHour ? String(parseFloat(String(body.pricePerHour))) : null,
        pricePerDay: body.pricePerDay ? String(parseFloat(String(body.pricePerDay))) : null,
        pricePerWeek: body.pricePerWeek ? String(parseFloat(String(body.pricePerWeek))) : null,
        pricePerMonth: body.pricePerMonth ? String(parseFloat(String(body.pricePerMonth))) : null,
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
        'pricePerHour', 'pricePerDay', 'pricePerWeek', 'pricePerMonth',
        'currency', 'spotType', 'hasEvCharging', 'hasSecurityCamera',
        'is24Hours', 'phone', 'paymentType', 'contactEmail', 'advertiserType',
        'companyName', 'pib', 'numberOfSpots', 'contactPerson', 'pricingType',
        'subscriptionType', 'autoRenewal', 'isPremium', 'isActive',
        'stripeLink', 'stripeLinkActive', 'category', 'totalSpaces',
        'hasRamp', 'rampPhone'];
      for (const f of fields) {
        if (body[f] !== undefined) updates[f] = body[f];
      }
      if (updates.latitude !== undefined) updates.latitude = String(updates.latitude);
      if (updates.longitude !== undefined) updates.longitude = String(updates.longitude);
      const nullOrStr = (v: any) => (v === "" || v === null || v === undefined || isNaN(parseFloat(String(v)))) ? null : String(parseFloat(String(v)));
      if (updates.pricePerHour !== undefined) updates.pricePerHour = nullOrStr(updates.pricePerHour);
      if (updates.pricePerDay !== undefined) updates.pricePerDay = nullOrStr(updates.pricePerDay);
      if (updates.pricePerWeek !== undefined) updates.pricePerWeek = nullOrStr(updates.pricePerWeek);
      if (updates.pricePerMonth !== undefined) updates.pricePerMonth = nullOrStr(updates.pricePerMonth);
      if (updates.totalSpaces !== undefined) updates.totalSpaces = parseInt(String(updates.totalSpaces), 10) || 1;
      const spot = await storage.updateParkingSpot(req.params.id, updates);
      if (!spot) return res.status(404).json({ message: "Parking spot not found" });
      res.json(spot);
    } catch (error) {
      console.error("Error full-editing parking spot (admin):", error);
      res.status(500).json({ message: "Failed to update parking spot" });
    }
  });

  app.post('/api/admin/parking-spots/:id/activate-stripe', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const spot = await storage.getParkingSpot(req.params.id);
      if (!spot) return res.status(404).json({ message: "Parking spot not found" });

      let stripeProductId = spot.stripeProductId;
      if (stripeProductId) {
        try {
          await stripe.products.retrieve(stripeProductId);
        } catch {
          stripeProductId = null;
        }
      }
      if (!stripeProductId) {
        const productName = spot.parkingNumber
          ? `Parking ${spot.parkingNumber}`
          : `Parking: ${spot.title}`;
        const product = await stripe.products.create({
          name: productName,
          metadata: { spotId: spot.id, parkingNumber: spot.parkingNumber ?? '' },
        });
        stripeProductId = product.id;
      }

      const updated = await storage.updateParkingSpot(req.params.id, {
        stripeProductId,
        stripeLinkActive: true,
      });
      res.json(updated);
    } catch (error: any) {
      console.error("Error activating stripe for parking spot:", error);
      res.status(500).json({ message: error?.message || "Failed to activate Stripe" });
    }
  });

  app.post('/api/admin/parking-spots/:id/assign-number', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const spot = await storage.getParkingSpot(req.params.id);
      if (!spot) return res.status(404).json({ message: "Parking spot not found" });
      if (spot.parkingNumber) return res.json(spot);

      const parkingNumber = await generateParkingNumber(spot.city);
      const updated = await storage.updateParkingSpot(req.params.id, { parkingNumber });
      res.json(updated);
    } catch (error: any) {
      console.error("Error assigning parking number:", error);
      res.status(500).json({ message: error?.message || "Failed to assign number" });
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

  app.post('/api/admin/parking-spots/:id/apply-pending', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const spot = await storage.getParkingSpot(req.params.id);
      if (!spot) return res.status(404).json({ message: "Parking spot not found" });
      if (!spot.pendingChanges) return res.status(400).json({ message: "No pending changes" });
      const updated = await storage.applyAndClearPendingChanges(req.params.id);
      if (!updated) return res.status(500).json({ message: "Failed to apply pending changes" });
      res.json(updated);
    } catch (error) {
      console.error("Error applying pending changes (admin):", error);
      res.status(500).json({ message: "Failed to apply pending changes" });
    }
  });

  // ─── Credit Wallet ───────────────────────────────────────────────────────
  app.get('/api/credits/balance', isAuthenticated, async (req: any, res) => {
    try {
      const balance = await storage.getCreditBalance(req.session.userId);
      const transactions = await storage.getCreditTransactions(req.session.userId);
      res.json({ balance, transactions });
    } catch (e: any) {
      console.error('[Credits] balance error:', e);
      res.status(500).json({ message: 'Greška pri dohvatanju balansa' });
    }
  });

  // Credit packages in RSD
  const CREDIT_PACKAGES: Record<string, { amountRsd: number; label: string }> = {
    '500':  { amountRsd: 500,  label: '500 RSD kredita' },
    '1000': { amountRsd: 1000, label: '1.000 RSD kredita' },
    '2000': { amountRsd: 2000, label: '2.000 RSD kredita' },
    '5000': { amountRsd: 5000, label: '5.000 RSD kredita' },
  };

  app.post('/api/credits/checkout', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId;
      const origin = req.headers.origin || `https://${req.headers.host}`;

      // Support custom amount (from map-hack inline topup) OR fixed package (from dashboard)
      let amountRsd: number;
      let label: string;
      if (req.body.customAmount) {
        amountRsd = parseInt(String(req.body.customAmount), 10);
        if (!amountRsd || amountRsd < 1000) return res.status(400).json({ message: 'Minimalna uplata je 1.000 RSD' });
        label = `${amountRsd.toLocaleString('sr-RS')} RSD kredita`;
      } else {
        const pkg = CREDIT_PACKAGES[String(req.body.package)];
        if (!pkg) return res.status(400).json({ message: 'Nevalidan paket' });
        amountRsd = pkg.amountRsd;
        label = pkg.label;
      }

      // Optional: resume parking after topup (map-hack flow) — keep as string (UUID)
      const resumeParkingId: string | null = req.body.resumeParkingId ? String(req.body.resumeParkingId) : null;
      const successUrl = resumeParkingId
        ? `${origin}/map-hack?credit_session={CHECKOUT_SESSION_ID}&resume_parking=${encodeURIComponent(resumeParkingId)}`
        : `${origin}/dashboard?tab=profile&credit_session={CHECKOUT_SESSION_ID}`;
      const cancelUrl = resumeParkingId
        ? `${origin}/map-hack`
        : `${origin}/dashboard?tab=profile`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'rsd',
            product_data: { name: `CarDrop Kredit — ${label}` },
            unit_amount: Math.round(amountRsd * 1.015) * 100,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { type: 'credit_topup', userId: String(userId), amountRsd: String(amountRsd) },
      });
      res.json({ url: session.url });
    } catch (e: any) {
      console.error('[Credits] checkout error:', e);
      res.status(500).json({ message: 'Greška pri kreiranju naplate' });
    }
  });

  app.post('/api/credits/verify', isAuthenticated, async (req: any, res) => {
    try {
      const stripe = await getUncachableStripeClient();
      const userId = req.session.userId;
      const { sessionId } = req.body;
      if (!sessionId) return res.status(400).json({ message: 'Nedostaje sessionId' });

      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') return res.status(400).json({ message: 'Plaćanje nije završeno' });
      if (session.metadata?.userId !== String(userId)) return res.status(403).json({ message: 'Neovlašćen pristup' });
      if (session.metadata?.type !== 'credit_topup') return res.status(400).json({ message: 'Nevalidna sesija' });

      const already = await storage.isCreditSessionConsumed(sessionId);
      if (already) {
        const balance = await storage.getCreditBalance(userId);
        return res.json({ success: true, alreadyConsumed: true, balance });
      }

      const amountRsd = parseInt(session.metadata?.amountRsd || '0', 10);
      if (!amountRsd || amountRsd <= 0) return res.status(400).json({ message: 'Nevalidan iznos' });

      await storage.addCreditTopup(userId, amountRsd, sessionId);
      const balance = await storage.getCreditBalance(userId);
      res.json({ success: true, amountRsd, balance });
    } catch (e: any) {
      console.error('[Credits] verify error:', e);
      res.status(500).json({ message: 'Greška pri verifikaciji plaćanja' });
    }
  });
  // ─── End Credit Wallet ───────────────────────────────────────────────────

  app.get('/api/admin/parking-spots/:id/bookings', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const bookingList = await storage.getSpotBookings(req.params.id);
      const paid = bookingList
        .filter(b => b.paymentStatus === 'paid')
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      res.json(paid);
    } catch (error) {
      console.error("Error fetching spot bookings:", error);
      res.status(500).json({ message: "Failed to fetch spot bookings" });
    }
  });

  // Admin — sve rezervacije sa filterom po datumu (start_time)
  app.get('/api/admin/bookings', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { from, to } = req.query;
      const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to as string) : new Date();
      toDate.setHours(23, 59, 59, 999);

      const result = await db.execute(sql`
        SELECT
          b.id, b.start_time, b.end_time, b.total_price, b.currency,
          b.status, b.payment_status, b.payment_method, b.license_plate,
          b.space_number, b.pricing_type, b.created_at,
          r.id AS renter_id, r.first_name AS renter_first_name, r.last_name AS renter_last_name, r.email AS renter_email,
          s.id AS spot_id, s.title AS spot_title, s.address AS spot_address,
          o.id AS owner_id, o.first_name AS owner_first_name, o.last_name AS owner_last_name, o.email AS owner_email
        FROM bookings b
        JOIN parking_spots s ON b.spot_id = s.id
        JOIN users r ON b.renter_id = r.id
        JOIN users o ON s.owner_id = o.id
        WHERE b.start_time >= ${fromDate} AND b.start_time <= ${toDate}
        ORDER BY b.start_time DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching admin bookings:", error);
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  // Admin — agregirane metrike za rezervacije u periodu
  app.get('/api/admin/bookings/metrics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { from, to } = req.query;
      const fromDate = from ? new Date(from as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = to ? new Date(to as string) : new Date();
      toDate.setHours(23, 59, 59, 999);

      const EUR_TO_RSD = 117;
      const STRIPE_FIXED_RSD = 0.30 * EUR_TO_RSD;

      const result = await db.execute(sql`
        SELECT
          COUNT(*) AS total_count,
          COUNT(*) FILTER (WHERE b.payment_status = 'paid') AS paid_count,
          COUNT(*) FILTER (WHERE b.payment_status = 'paid' AND b.payment_method = 'instant') AS instant_count,
          COUNT(*) FILTER (WHERE b.payment_status = 'paid' AND (b.payment_method IS NULL OR b.payment_method != 'instant')) AS kredit_count,
          COALESCE(SUM(b.total_price) FILTER (WHERE b.payment_status = 'paid'), 0) AS total_revenue,
          COALESCE(SUM(b.total_price * 0.811 - ${STRIPE_FIXED_RSD}) FILTER (WHERE b.payment_status = 'paid' AND b.payment_method = 'instant'), 0) AS instant_payout,
          COALESCE(SUM(b.total_price * 0.835) FILTER (WHERE b.payment_status = 'paid' AND (b.payment_method IS NULL OR b.payment_method != 'instant')), 0) AS kredit_payout
        FROM bookings b
        WHERE b.start_time >= ${fromDate} AND b.start_time <= ${toDate}
      `);

      const row = result.rows[0] as any;
      const instantPayout = parseFloat(row.instant_payout || '0');
      const kreditPayout = parseFloat(row.kredit_payout || '0');

      res.json({
        totalCount: parseInt(row.total_count || '0'),
        paidCount: parseInt(row.paid_count || '0'),
        instantCount: parseInt(row.instant_count || '0'),
        kreditCount: parseInt(row.kredit_count || '0'),
        totalRevenue: parseFloat(row.total_revenue || '0'),
        instantPayout,
        kreditPayout,
        totalPayout: instantPayout + kreditPayout,
        cardropRevenue: parseFloat(row.total_revenue || '0') - (instantPayout + kreditPayout),
      });
    } catch (error) {
      console.error("Error fetching admin booking metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
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

  // Admin: one-time rename of SRB1 → next available NS number
  app.post('/api/admin/rename-srb1', isAuthenticated, isAdmin, async (_req, res) => {
    try {
      const maxResult = await db.execute(sql`
        SELECT MAX(CAST(SUBSTRING(parking_number FROM 3) AS INTEGER)) AS max_ns
        FROM parking_spots
        WHERE parking_number ~ '^NS[0-9]+$'
      `);
      const maxNs: number = (maxResult.rows[0] as any)?.max_ns ?? 0;
      const nextNs = `NS${maxNs + 1}`;
      const result = await db.execute(sql`
        UPDATE parking_spots
        SET parking_number = ${nextNs}
        WHERE parking_number = 'SRB1'
        RETURNING id, title, parking_number
      `);
      const updated = result.rows as any[];
      if (updated.length === 0) {
        return res.json({ success: false, message: 'SRB1 nije pronađen — možda je već preimenovan.' });
      }
      res.json({ success: true, renamedTo: nextNs, spots: updated });
    } catch (error) {
      console.error('Error renaming SRB1:', error);
      res.status(500).json({ message: 'Greška pri preimenovanju SRB1' });
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

  // ─── Partner Accommodations ────────────────────────────────────────────────

  app.get('/api/accommodations', async (req: any, res) => {
    try {
      const { db } = await import('./db');
      const { partnerAccommodations } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const isAdmin = req.session?.userId
        ? ((await db.query.users.findFirst({ where: (u: any, { eq: eqFn }: any) => eqFn(u.id, req.session.userId) })) as any)?.isAdmin
        : false;
      const rows = isAdmin
        ? await db.select().from(partnerAccommodations).orderBy(partnerAccommodations.createdAt)
        : await db.select().from(partnerAccommodations).where(eq(partnerAccommodations.isActive, true)).orderBy(partnerAccommodations.createdAt);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching accommodations:", error);
      res.status(500).json({ message: "Failed to fetch accommodations" });
    }
  });

  app.get('/api/accommodations/:city', async (req, res) => {
    try {
      const { db } = await import('./db');
      const { partnerAccommodations } = await import('@shared/schema');
      const { eq, and } = await import('drizzle-orm');
      const validCities = ['novi_sad', 'beograd', 'nis'];
      if (!validCities.includes(req.params.city)) {
        return res.status(400).json({ message: "Invalid city" });
      }
      const rows = await db.select().from(partnerAccommodations)
        .where(and(eq(partnerAccommodations.city, req.params.city), eq(partnerAccommodations.isActive, true)))
        .orderBy(partnerAccommodations.createdAt);
      res.json(rows);
    } catch (error) {
      console.error("Error fetching accommodations by city:", error);
      res.status(500).json({ message: "Failed to fetch accommodations" });
    }
  });

  app.post('/api/accommodations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) return res.status(403).json({ message: "Admin only" });
      const { db } = await import('./db');
      const { partnerAccommodations, insertPartnerAccommodationSchema } = await import('@shared/schema');
      const parsed = insertPartnerAccommodationSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
      const [row] = await db.insert(partnerAccommodations).values(parsed.data).returning();
      res.json(row);
    } catch (error) {
      console.error("Error creating accommodation:", error);
      res.status(500).json({ message: "Failed to create accommodation" });
    }
  });

  app.put('/api/accommodations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) return res.status(403).json({ message: "Admin only" });
      const { db } = await import('./db');
      const { partnerAccommodations, insertPartnerAccommodationSchema } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      const parsed = insertPartnerAccommodationSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Validation error", errors: parsed.error.issues });
      const [row] = await db.update(partnerAccommodations).set(parsed.data).where(eq(partnerAccommodations.id, req.params.id)).returning();
      if (!row) return res.status(404).json({ message: "Not found" });
      res.json(row);
    } catch (error) {
      console.error("Error updating accommodation:", error);
      res.status(500).json({ message: "Failed to update accommodation" });
    }
  });

  app.delete('/api/accommodations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) return res.status(403).json({ message: "Admin only" });
      const { db } = await import('./db');
      const { partnerAccommodations } = await import('@shared/schema');
      const { eq } = await import('drizzle-orm');
      await db.delete(partnerAccommodations).where(eq(partnerAccommodations.id, req.params.id));
      res.json({ message: "Deleted" });
    } catch (error) {
      console.error("Error deleting accommodation:", error);
      res.status(500).json({ message: "Failed to delete accommodation" });
    }
  });

  // Image upload for accommodations (admin only, same pattern as parking spots)
  app.post('/api/accommodations/upload-image', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      if (!user?.isAdmin) return res.status(403).json({ message: "Admin only" });
      const objectStorage = new ObjectStorageService();
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', async () => {
        try {
          const buffer = Buffer.concat(chunks);
          const contentType = req.headers['content-type'] || 'image/jpeg';
          const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
          const subpath = `accommodations/${userId}/${Date.now()}.${ext}`;
          const url = await objectStorage.uploadPublicBuffer(subpath, buffer, contentType);
          res.json({ url });
        } catch (err) {
          console.error("Error uploading accommodation image:", err);
          res.status(500).json({ message: "Upload failed" });
        }
      });
    } catch (error) {
      console.error("Error in accommodation image upload:", error);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
