import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { storage } from "./storage";
import { z } from "zod";

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    returnTo?: string;
  }
}

const googleClient = new OAuth2Client();

const registerSchema = z.object({
  email: z.string().email("Unesite validnu email adresu"),
  password: z.string().min(6, "Lozinka mora imati najmanje 6 karaktera"),
  firstName: z.string().min(1, "Ime je obavezno"),
  lastName: z.string().min(1, "Prezime je obavezno"),
});

const loginSchema = z.object({
  email: z.string().email("Unesite validnu email adresu"),
  password: z.string().min(1, "Lozinka je obavezna"),
});

export function getSession() {
  const sessionTtl = 30 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);

      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(409).json({ message: "Nalog sa ovim emailom već postoji" });
      }

      const passwordHash = await bcrypt.hash(data.password, 12);

      const user = await storage.upsertUser({
        email: data.email,
        passwordHash,
        authProvider: 'local',
        firstName: data.firstName,
        lastName: data.lastName,
      });

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Greška pri registraciji" });
        }
        const { passwordHash: _, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Nevalidni podaci", errors: error.errors });
      }
      res.status(500).json({ message: "Greška pri registraciji" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(data.email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Pogrešan email ili lozinka" });
      }

      const valid = await bcrypt.compare(data.password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Pogrešan email ili lozinka" });
      }

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Greška pri prijavljivanju" });
        }
        const { passwordHash: _, ...safeUser } = user;
        res.json(safeUser);
      });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Nevalidni podaci", errors: error.errors });
      }
      res.status(500).json({ message: "Greška pri prijavljivanju" });
    }
  });

  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential, clientId } = req.body;

      if (!credential) {
        return res.status(400).json({ message: "Google credential is required" });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        return res.status(400).json({ message: "Invalid Google token" });
      }

      let user = await storage.getUserByEmail(payload.email);

      if (user) {
        await storage.updateUser(user.id, {
          firstName: payload.given_name || user.firstName,
          lastName: payload.family_name || user.lastName,
          profileImageUrl: payload.picture || user.profileImageUrl,
        });
        user = (await storage.getUser(user.id))!;
      } else {
        user = await storage.upsertUser({
          email: payload.email,
          authProvider: 'google',
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          profileImageUrl: payload.picture || '',
        });
      }

      req.session.userId = user.id;
      req.session.save((err) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Greška pri prijavljivanju" });
        }
        const { passwordHash: _, ...safeUser } = user!;
        res.json(safeUser);
      });
    } catch (error: any) {
      console.error("Google auth error:", error);
      res.status(401).json({ message: "Google autentifikacija nije uspela" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Greška pri odjavljivanju" });
      }
      res.clearCookie('connect.sid');
      res.json({ message: "Uspešno ste se odjavili" });
    });
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.clearCookie('connect.sid');
      res.redirect("/");
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};
