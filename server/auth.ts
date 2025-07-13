import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { z } from "zod";
import { insertUserSchema, insertUserWithBankSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Schema for user registration (backend only - confirmPassword validation happens on frontend)
// Now requires bank details for all users (both clients and service providers)
const registerSchema = insertUserWithBankSchema.extend({
  isServiceProvider: z.boolean(),
  // Service provider fields (optional, validated separately)
  categoryId: z.number().optional(),
  hourlyRate: z.number().optional(),
  bio: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  availability: z.string().optional(),
});

// Schema for service provider additional info
const providerExtendedSchema = z.object({
  categoryId: z.number(),
  hourlyRate: z.number().min(1),
  bio: z.string().optional(),
  yearsOfExperience: z.number().optional(),
  availability: z.string().optional(),
});

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "taskhire-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password"
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          } else {
            return done(null, user);
          }
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      console.log("Registration request body:", req.body);
      
      // Validate the registration data
      const validatedData = registerSchema.parse(req.body);
      
      // Check if email already exists
      const existingUserByEmail = await storage.getUserByEmail(validatedData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Hash password and create the user
      const user = await storage.createUser({
        ...validatedData,
        password: await hashPassword(validatedData.password)
      });
      
      // If user is a service provider, create service provider profile
      if (validatedData.isServiceProvider) {
        try {
          // Validate required provider fields
          if (!validatedData.categoryId || !validatedData.hourlyRate) {
            return res.status(400).json({ 
              message: "Category and hourly rate are required for service providers" 
            });
          }
          
          await storage.createServiceProvider({
            userId: user.id,
            categoryId: validatedData.categoryId,
            hourlyRate: validatedData.hourlyRate,
            bio: validatedData.bio || "",
            yearsOfExperience: validatedData.yearsOfExperience || 0,
            availability: validatedData.availability || ""
          });
        } catch (err) {
          // If service provider profile creation fails, still let the user register
          // but return a warning
          console.error("Failed to create service provider profile:", err);
          return res.status(201).json({ 
            user,
            warning: "User created but service provider profile could not be created"
          });
        }
      }

      // Log the user in
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(201).json(user);
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error("Registration validation error:", err.errors);
        return res.status(400).json({ 
          message: "Validation error", 
          errors: err.errors 
        });
      }
      console.error("Registration error:", err);
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  
  app.get("/api/user/provider", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const provider = await storage.getServiceProviderByUserId(req.user.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }
      
      const providerWithDetails = await storage.getServiceProviderWithUser(provider.id);
      res.json(providerWithDetails);
    } catch (err) {
      res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/user", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { firstName, lastName, email, phoneNumber, profilePicture } = req.body;
      
      // Update user profile
      const updatedUser = await storage.updateUser(req.user.id, {
        firstName,
        lastName,
        email,
        phoneNumber,
        profilePicture,
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.put("/api/user/provider", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { categoryId, hourlyRate, bio, yearsOfExperience, availability } = req.body;
      
      // Get existing provider profile
      const provider = await storage.getServiceProviderByUserId(req.user.id);
      
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }
      
      // Update provider profile
      const updatedProvider = await storage.updateServiceProvider(provider.id, {
        categoryId: parseInt(categoryId),
        hourlyRate: parseFloat(hourlyRate),
        bio,
        yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
        availability,
      });
      
      if (!updatedProvider) {
        return res.status(404).json({ message: "Failed to update provider profile" });
      }
      
      res.json(updatedProvider);
    } catch (err) {
      res.status(500).json({ message: "Failed to update provider profile" });
    }
  });
}
