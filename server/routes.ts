import express, { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Server, createServer } from "http";
import { WebSocketServer } from "ws";
import Stripe from "stripe";
import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import cookieParser from "cookie-parser";
import { storage } from "./storage";
import { insertTaskSchema, insertServiceRequestSchema, insertReviewSchema, insertUserSchema, insertWorkOrderSchema } from "../shared/schema";
import { verifyPassword, hashPassword, createOTP, verifyOTP } from "./auth";
import { pool } from "./db";

// Standard MemoryStore
const MemoryStore = session.MemoryStore;
const sessionStore = new MemoryStore();

// Add debugging to the session store methods
const originalGet = sessionStore.get.bind(sessionStore);
sessionStore.get = function(sessionId: string, callback: any) {
  return originalGet(sessionId, (err: any, session: any) => {
    callback(err, session);
  });
};

const originalSet = sessionStore.set.bind(sessionStore);
sessionStore.set = function(sessionId: string, session: any, callback: any) {
  return originalSet(sessionId, session, callback);
};

const originalDestroy = sessionStore.destroy.bind(sessionStore);
sessionStore.destroy = function(sessionId: string, callback: any) {
  return originalDestroy(sessionId, callback);
};

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
});

// Payment calculations
const calculatePlatformFee = (amount: number): number => {
  return Math.round(amount * 0.10); // 10% platform fee
};

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize session middleware FIRST (critical for authentication)

  // Add cookie-parser middleware before session middleware
  app.use(cookieParser());

  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    store: sessionStore,
    name: 'connect.sid', // Explicitly set cookie name
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: false,
      path: '/'
    },
    // Add these options to ensure proper session handling
    rolling: false,
    unset: 'keep'
  }));
  

  // Add session debugging middleware
  app.use((req, res, next) => {
    next();
  });

  // Initialize passport for session management
  app.use(passport.initialize());
  app.use(passport.session());

  // Serialize/deserialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: any, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // User authentication status endpoint
  app.get('/api/user', async (req, res) => {
    
    if (req.session && req.session.user) {
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });
  // ==============================
  // OTP AUTHENTICATION ROUTES
  // ==============================

  // Send OTP for email verification or login
  app.post("/api/auth/send-otp", async (req, res) => {
    try {
      const { email, purpose } = req.body;
      
      if (!email || !purpose) {
        return res.status(400).json({ message: "Email and purpose are required" });
      }

      if (!['email_verification', 'login_verification', 'password_reset'].includes(purpose)) {
        return res.status(400).json({ message: "Invalid purpose" });
      }

      const otpCode = await createOTP(email, purpose);
      
      res.json({ 
        message: "OTP sent successfully", 
        email: email.replace(/(.{3}).*(@.*)/, '$1***$2') // Mask email for security
      });
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  // Verify OTP and complete registration
  app.post("/api/auth/verify-otp-register", async (req, res) => {
    try {
      const { email, otp, password, firstName, lastName, role, username, categoryId, hourlyRate, bio, yearsOfExperience, availability } = req.body;
      
      if (!email || !otp || !password || !firstName || !lastName || !username) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Verify OTP
      const otpResult = await verifyOTP(email, otp, 'email_verification');
      if (!otpResult.success) {
        return res.status(400).json({ message: otpResult.message });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create user with verified email
      const hashedPassword = hashPassword(password);
      const userData = insertUserSchema.parse({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'client',
        isEmailVerified: true
      });

      const user = await storage.createUser(userData);
      
      // If user is a service provider, create the provider profile
      if (role === 'service_provider') {
        
        if (!categoryId || !hourlyRate) {
          return res.status(400).json({ message: "Category and hourly rate are required for service providers" });
        }

        const providerData = {
          userId: user.id,
          categoryId: parseInt(categoryId),
          hourlyRate: parseFloat(hourlyRate),
          bio: bio || "",
          yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : null,
          availability: availability || "",
          rating: 0,
          completedJobs: 0,
          isVerified: false
        };
        
        try {
          const createdProvider = await storage.createServiceProvider(providerData);
        } catch (providerError) {
          // Don't fail the registration, just log the error
        }
      }
      
      res.status(201).json({ 
        message: "Registration successful", 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          role: user.role 
        } 
      });
    } catch (error) {
      console.error('OTP registration error:', error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Verify OTP for password reset
  app.post("/api/auth/verify-otp", async (req, res) => {
    try {
      const { email, otp, purpose } = req.body;
      
      if (!email || !otp || !purpose) {
        return res.status(400).json({ message: "Email, OTP, and purpose are required" });
      }

      if (!['email_verification', 'login_verification', 'password_reset'].includes(purpose)) {
        return res.status(400).json({ message: "Invalid purpose" });
      }

      // Verify OTP
      const otpResult = await verifyOTP(email, otp, purpose);
      if (!otpResult.success) {
        return res.status(400).json({ message: otpResult.message });
      }

      res.json({ 
        message: "OTP verified successfully",
        success: true
      });
    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({ message: "OTP verification failed" });
    }
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;
      
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: "Email, OTP, and new password are required" });
      }

      // Verify OTP for password reset
      const otpResult = await verifyOTP(email, otp, 'password_reset');
      if (!otpResult.success) {
        return res.status(400).json({ message: otpResult.message });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash new password
      const hashedPassword = hashPassword(newPassword);
      
      // Update user password
      const updatedUser = await storage.updateUser(user.id, {
        password: hashedPassword
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      res.json({ 
        message: "Password reset successfully",
        success: true
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: "Password reset failed" });
    }
  });

  // Login with email + password + optional OTP
  app.post("/api/auth/login-otp", async (req, res) => {
    try {
      const { email, password, otp } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      if (!verifyPassword(password, user.password)) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Check if OTP is required (for additional security)
      if (otp) {
        const otpResult = await verifyOTP(email, otp, 'login_verification');
        if (!otpResult.success) {
          return res.status(400).json({ message: otpResult.message });
        }
      }

      // Check if email is verified
      if (!user.isEmailVerified) {
        return res.status(400).json({ 
          message: "Email not verified. Please verify your email first.",
          requiresEmailVerification: true 
        });
      }

      // Login successful - create session manually
      if (!req.session) {
        return res.status(500).json({ message: "Session not initialized" });
      }
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role
      };
      
      res.json({ 
        message: "Login successful", 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          role: user.role 
        } 
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Simple login endpoint (non-OTP) - for frontend compatibility
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const passwordValid = verifyPassword(password, user.password);
      
      if (!passwordValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Login successful - create session manually
      if (!req.session) {
        return res.status(500).json({ message: "Session not initialized" });
      }
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role
      };
      
      // Save session explicitly
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "Session save failed" });
        }
        
        res.json({ 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          username: user.username,
          role: user.role 
        });
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Simple registration endpoint (non-OTP)
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName, role, username } = req.body;
      
      if (!email || !password || !firstName || !lastName || !username) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Create user
      const hashedPassword = hashPassword(password);
      const userData = insertUserSchema.parse({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: role || 'client',
        isEmailVerified: true
      });

      const user = await storage.createUser(userData);
      
      // Create session
      if (!req.session) {
        return res.status(500).json({ message: "Session not initialized" });
      }
      req.session.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role
      };
      
      res.status(201).json({ 
        message: "Registration successful", 
        user: { 
          id: user.id, 
          email: user.email, 
          firstName: user.firstName, 
          lastName: user.lastName,
          role: user.role 
        } 
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  

  // Service categories routes
  app.get("/api/categories", async (_req, res) => {
    try {
      const categories = await storage.getServiceCategories();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });
  
  app.get("/api/categories/:id", async (req, res) => {
    try {
      const category = await storage.getServiceCategory(parseInt(req.params.id));
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch category" });
    }
  });

  // Service providers routes
  app.get("/api/providers", async (_req, res) => {
    try {
      const providers = await storage.getServiceProviders();
      
      // Fetch user and category info for each provider
      const providersWithDetails = await Promise.all(
        providers.map(async (provider) => {
          const user = await storage.getUser(provider.userId);
          const category = await storage.getServiceCategory(provider.categoryId);
          
          if (!user || !category) return null;
          
          return {
            ...provider,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              profilePicture: user.profilePicture,
              username: user.username
            },
            category
          };
        })
      );
      
      // Filter out null results
      res.json(providersWithDetails.filter(p => p !== null));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service providers" });
    }
  });
  
  app.get("/api/providers/category/:categoryId", async (req, res) => {
    try {
      const categoryId = parseInt(req.params.categoryId);
      const providers = await storage.getServiceProvidersByCategory(categoryId);
      
      // Fetch user info for each provider
      const providersWithDetails = await Promise.all(
        providers.map(async (provider) => {
          const user = await storage.getUser(provider.userId);
          const category = await storage.getServiceCategory(provider.categoryId);
          
          if (!user || !category) return null;
          
          return {
            ...provider,
            user: {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              profilePicture: user.profilePicture,
              username: user.username
            },
            category
          };
        })
      );
      
      // Filter out null results
      res.json(providersWithDetails.filter(p => p !== null));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service providers" });
    }
  });

  // Get current user's service provider profile
  app.get("/api/providers/me", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const result = await pool.query('SELECT * FROM service_providers WHERE user_id = $1', [req.user.id]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: "Service provider profile not found" });
      }
      
      const row = result.rows[0];
      const provider = {
        id: row.id,
        userId: row.user_id,
        categoryId: row.category_id,
        bio: row.bio,
        hourlyRate: row.hourly_rate,
        yearsOfExperience: row.years_of_experience,
        availability: row.availability,
        rating: row.rating,
        completedJobs: row.completed_jobs,
        verificationStatus: row.verification_status,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
    
      res.json(provider);
    } catch (error) {
      const err = error as Error;
      console.error('Database error in /api/providers/me:', err);
      console.error('Error stack:', err.stack);
      res.status(500).json({ message: "Database error", error: err.message });
    }
  });

  // Update current user's service provider profile
  app.put("/api/providers/me", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const { categoryId, hourlyRate, bio, experience } = req.body;
      
      // Validate required fields
      if (!categoryId || !hourlyRate || !bio) {
        return res.status(400).json({ message: "Category, hourly rate, and bio are required" });
      }
      
      const serviceProvider = await storage.getServiceProviderByUserId(req.user.id);
      
      
      if (!serviceProvider) {
        
        
        // Try to create a provider profile if it doesn't exist
        try {
          
          const newProviderData = {
            userId: req.user.id,
            categoryId: parseInt(categoryId),
            hourlyRate: parseFloat(hourlyRate),
            bio: bio || "",
            yearsOfExperience: experience ? parseInt(experience) : null,
            availability: "",
            rating: 0,
            completedJobs: 0,
            isVerified: false
          };
          
          const createdProvider = await storage.createServiceProvider(newProviderData);
          
          res.json(createdProvider);
          return;
        } catch (createError) {
          console.error('Failed to create provider profile:', createError);
          return res.status(404).json({ message: "Service provider profile not found and could not be created" });
        }
      }
      
      const updatedProvider = await storage.updateServiceProvider(serviceProvider.id, {
        categoryId: parseInt(categoryId),
        hourlyRate: parseFloat(hourlyRate),
        bio,
        yearsOfExperience: experience ? parseInt(experience) : null
      });
      
      res.json(updatedProvider);
    } catch (error) {
      console.error('Error updating service provider profile:', error);
      res.status(500).json({ message: "Failed to update service provider profile" });
    }
  });

  // Get providers pending verification
  app.get("/api/providers/pending-verification", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'service_verifier' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      
      
      // Step 1: Get all providers
      const providers = await storage.getServiceProviders();
      
      
      // Step 2: Filter providers who have pending documents OR pending overall status
      const providersWithPendingDocs = [];
      
      for (const provider of providers) {
        // Get documents for this provider
        const documents = await storage.getServiceProviderDocuments(provider.id);
        
        // Check if provider has any pending documents OR overall status is pending
        const hasPendingDocuments = documents.some(doc => doc.verificationStatus === 'pending');
        const isOverallPending = provider.verificationStatus === 'pending';
        
        
        if (hasPendingDocuments || isOverallPending) {
          providersWithPendingDocs.push(provider);
          
        }
      }
      
      
      
      // Step 3: Get basic data for each provider with pending items
      const result = [];
      
      for (const provider of providersWithPendingDocs) {
        try {
          
          
          // Get user
          const user = await storage.getUser(provider.userId);
          
          
          // Get category
          const category = await storage.getServiceCategory(provider.categoryId);
          
          
          // Get documents
          const documents = await storage.getServiceProviderDocuments(provider.id);
          
          
          if (user) {
            result.push({
              id: provider.id,
              userId: provider.userId,
              categoryId: provider.categoryId,
              hourlyRate: provider.hourlyRate,
              bio: provider.bio,
              yearsOfExperience: provider.yearsOfExperience,
              availability: provider.availability,
              rating: provider.rating,
              completedJobs: provider.completedJobs,
              verificationStatus: provider.verificationStatus,
              verifiedBy: provider.verifiedBy,
              verifiedAt: provider.verifiedAt,
              rejectionReason: provider.rejectionReason,
              createdAt: provider.createdAt,
              updatedAt: provider.updatedAt,
              user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role
              },
              category: category ? {
                id: category.id,
                name: category.name,
                description: category.description,
                icon: category.icon
              } : null,
              documents: documents.map(doc => ({
                id: doc.id,
                providerId: doc.providerId,
                documentType: doc.documentType,
                documentUrl: doc.documentUrl,
                originalName: doc.originalName,
                uploadedAt: doc.uploadedAt,
                verificationStatus: doc.verificationStatus,
                verifiedBy: doc.verifiedBy,
                verifiedAt: doc.verifiedAt,
                notes: doc.notes
              }))
            });
            
            
          } 
          
        } catch (error) {
          console.error(`❌ Error processing provider ${provider.id}:`, error);
          // Continue with other providers
        }
      }
      
      
      res.json(result);
      
    } catch (error) {
      console.error('❌ Error in pending verification endpoint:', error);
      console.error('Error stack:', error.stack);
      res.status(500).json({ 
        message: "Failed to fetch pending providers", 
        error: error.message,
        stack: error.stack 
      });
    }
  });

  // Get recently verified providers
  app.get("/api/providers/recently-verified", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'service_verifier' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      
      
      // Get providers verified in the last 7 days
      const providers = await storage.getServiceProviders();
      
      
      
      const recentlyVerified = [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      
      for (const provider of providers) {
        if (provider.verificationStatus === 'verified' && 
            provider.verifiedAt && 
            new Date(provider.verifiedAt) >= sevenDaysAgo) {
          
          try {
            const user = await storage.getUser(provider.userId);
            
            if (user) {
              recentlyVerified.push({
                id: provider.id,
                userId: provider.userId,
                verificationStatus: provider.verificationStatus,
                verifiedAt: provider.verifiedAt,
                user: {
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email
                }
              });
            }
          } catch (error) {
            console.error(`Error processing verified provider ${provider.id}:`, error);
            // Continue with other providers
          }
        }
      }
      
      
      res.json(recentlyVerified);
    } catch (error) {
      console.error('❌ Error in recently verified endpoint:', error);
      res.status(500).json({ message: "Failed to fetch recently verified providers" });
    }
  });
  
  app.get("/api/providers/:id", async (req, res) => {
    try {
      const providerId = parseInt(req.params.id);
      const providerWithDetails = await storage.getServiceProviderWithUser(providerId);
      
      if (!providerWithDetails) {
        return res.status(404).json({ message: "Provider not found" });
      }
      
      // Get reviews for this provider
      const reviews = await storage.getReviewsByProvider(providerId);
      
      // Enhance reviews with client info
      const reviewsWithClientInfo = await Promise.all(
        reviews.map(async (review) => {
          const client = await storage.getUser(review.clientId);
          return {
            ...review,
            client: client ? {
              id: client.id,
              firstName: client.firstName,
              lastName: client.lastName,
              profilePicture: client.profilePicture
            } : null
          };
        })
      );
      
      res.json({
        ...providerWithDetails,
        reviews: reviewsWithClientInfo
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch provider details" });
    }
  });

  // Tasks routes (creation handled later with enhanced notification system)
  
  app.get("/api/tasks", async (_req, res) => {
    try {
      const tasks = await storage.getTasks();
      
      // Enhance tasks with client and category info
      const tasksWithDetails = await Promise.all(
        tasks.map(async (task) => {
          const client = await storage.getUser(task.clientId);
          const category = await storage.getServiceCategory(task.categoryId);
          
          if (!client || !category) return null;
          
          return {
            ...task,
            client: {
              id: client.id,
              firstName: client.firstName,
              lastName: client.lastName,
              profilePicture: client.profilePicture
            },
            category
          };
        })
      );
      
      // Filter out null results
      res.json(tasksWithDetails.filter(t => t !== null));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  
  app.get("/api/tasks/client", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const tasks = await storage.getTasksByClient(req.user.id);
      
      // Enhance tasks with category info
      const tasksWithDetails = await Promise.all(
        tasks.map(async (task) => {
          const category = await storage.getServiceCategory(task.categoryId);
          return category ? { ...task, category } : null;
        })
      );
      
      // Filter out null results
      res.json(tasksWithDetails.filter(t => t !== null));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });
  
  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const client = await storage.getUser(task.clientId);
      const category = await storage.getServiceCategory(task.categoryId);
      
      if (!client || !category) {
        return res.status(404).json({ message: "Task details not found" });
      }
      
      res.json({
        ...task,
        client: {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          profilePicture: client.profilePicture
        },
        category
      });
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });
  
  app.put("/api/tasks/:id", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      if (task.clientId !== req.user.id) {
        return res.status(403).json({ message: "You can only update your own tasks" });
      }
      
      const updatedTask = await storage.updateTask(taskId, req.body);
      res.json(updatedTask);
    } catch (err) {
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // ========== TASK QUOTES ROUTES (3-Stage Approval System) ==========

  // Submit a quote for a task
  app.post("/api/tasks/:id/quotes", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      if (req.user.role !== 'service_provider') {
        return res.status(403).json({ message: "Only service providers can submit quotes" });
      }

      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      const serviceProvider = await storage.getServiceProviderByUserId(req.user.id);
      if (!serviceProvider) {
        return res.status(404).json({ message: "Service provider profile not found" });
      }

      // Check if provider already submitted a quote for this task
      const existingQuote = await storage.getTaskQuoteByTaskAndProvider(taskId, serviceProvider.id);
      if (existingQuote) {
        return res.status(400).json({ message: "You have already submitted a quote for this task" });
      }

      const quoteData = {
        taskId,
        providerId: serviceProvider.id,
        quoteAmount: req.body.quoteAmount,
        estimatedHours: req.body.estimatedHours,
        message: req.body.message,
        toolsProvided: req.body.toolsProvided,
        additionalServices: req.body.additionalServices,
      };

      const quote = await storage.createTaskQuote(quoteData);

      // Create notification for client
      const notification = await storage.createNotification({
        userId: task.clientId,
        type: 'quote_submitted',
        title: 'New Quote Received',
        message: `A service provider has submitted a quote for your task: "${task.title}"`,
        data: JSON.stringify({ taskId, quoteId: quote.id })
      });

      await sendNotificationToUser(task.clientId, notification);

      res.status(201).json(quote);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: err.errors 
        });
      }
      res.status(500).json({ message: "Failed to submit quote" });
    }
  });

  // Get quotes for a task (client can see all quotes, provider can only see their own)
  app.get("/api/tasks/:id/quotes", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      let quotes;
      if (req.user.role === 'client' && task.clientId === req.user.id) {
        // Client can see all quotes for their task
        quotes = await storage.getTaskQuotesByTask(taskId);
      } else if (req.user.role === 'service_provider') {
        // Provider can only see their own quote
        const serviceProvider = await storage.getServiceProviderByUserId(req.user.id);
        if (!serviceProvider) {
          return res.status(404).json({ message: "Service provider profile not found" });
        }
        const quote = await storage.getTaskQuoteByTaskAndProvider(taskId, serviceProvider.id);
        quotes = quote ? [quote] : [];
      } else {
        return res.status(403).json({ message: "Not authorized to view quotes for this task" });
      }

      res.json(quotes);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // Stage 1: Approve price
  app.post("/api/tasks/:id/quotes/approve-price", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only client can approve price
      if (req.user.role !== 'client' || task.clientId !== req.user.id) {
        return res.status(403).json({ message: "Only the task owner can approve quotes" });
      }

      // Get all quotes for this task and find the one to approve
      const quotes = await storage.getTaskQuotesByTask(taskId);
      if (quotes.length === 0) {
        return res.status(404).json({ message: "No quotes found for this task" });
      }

      // For now, approve the first quote (you can add logic to select specific quote)
      const quote = quotes[0];
      const serviceProvider = await storage.getServiceProvider(quote.providerId);
      if (!serviceProvider) {
        return res.status(404).json({ message: "Service provider not found" });
      }

      const updatedQuote = await storage.updateTaskQuote(quote.id, {
        priceApproved: true,
        priceApprovedAt: new Date(),
        priceApprovedBy: req.user.id,
        status: 'price_approved'
      });

      // Create notification for provider
      const notification = await storage.createNotification({
        userId: serviceProvider.userId,
        type: 'quote_price_approved',
        title: 'Quote Price Approved',
        message: `Your quote price for task "${task.title}" has been approved. Awaiting task review.`,
        data: JSON.stringify({ taskId, quoteId: quote.id })
      });

      await sendNotificationToUser(serviceProvider.userId, notification);

      res.json(updatedQuote);
    } catch (err) {
      res.status(500).json({ message: "Failed to approve price" });
    }
  });

  // Stage 2: Approve task review
  app.post("/api/tasks/:id/quotes/approve-task", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only client can approve task review
      if (req.user.role !== 'client' || task.clientId !== req.user.id) {
        return res.status(403).json({ message: "Only the task owner can approve task review" });
      }

      // Get all quotes for this task and find the one to approve
      const quotes = await storage.getTaskQuotesByTask(taskId);
      if (quotes.length === 0) {
        return res.status(404).json({ message: "No quotes found for this task" });
      }

      // For now, approve the first quote that has price approved
      const quote = quotes.find(q => q.priceApproved);
      if (!quote) {
        return res.status(400).json({ message: "No quotes with approved price found" });
      }

      const serviceProvider = await storage.getServiceProvider(quote.providerId);
      if (!serviceProvider) {
        return res.status(404).json({ message: "Service provider not found" });
      }

      const updatedQuote = await storage.updateTaskQuote(quote.id, {
        taskReviewed: true,
        taskReviewedAt: new Date(),
        taskReviewedBy: req.user.id,
        status: 'task_reviewed'
      });

      // Create notification for provider
      const notification = await storage.createNotification({
        userId: serviceProvider.userId,
        type: 'quote_task_approved',
        title: 'Task Review Approved',
        message: `Your task review for "${task.title}" has been approved. Awaiting customer details release.`,
        data: JSON.stringify({ taskId, quoteId: quote.id })
      });

      await sendNotificationToUser(serviceProvider.userId, notification);

      res.json(updatedQuote);
    } catch (err) {
      res.status(500).json({ message: "Failed to approve task review" });
    }
  });

  // Stage 3: Release customer details
  app.post("/api/tasks/:id/quotes/release-customer-details", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only client can release customer details
      if (req.user.role !== 'client' || task.clientId !== req.user.id) {
        return res.status(403).json({ message: "Only the task owner can release customer details" });
      }

      // Get all quotes for this task and find the one to approve
      const quotes = await storage.getTaskQuotesByTask(taskId);
      if (quotes.length === 0) {
        return res.status(404).json({ message: "No quotes found for this task" });
      }

      // For now, approve the first quote that has price and task review approved
      const quote = quotes.find(q => q.priceApproved && q.taskReviewed);
      if (!quote) {
        return res.status(400).json({ message: "No quotes with approved price and task review found" });
      }

      const serviceProvider = await storage.getServiceProvider(quote.providerId);
      if (!serviceProvider) {
        return res.status(404).json({ message: "Service provider not found" });
      }

      const updatedQuote = await storage.updateTaskQuote(quote.id, {
        customerDetailsReleased: true,
        customerDetailsReleasedAt: new Date(),
        customerDetailsReleasedBy: req.user.id,
        status: 'customer_details_released'
      });

      // Create notification for provider with customer details
      const notification = await storage.createNotification({
        userId: serviceProvider.userId,
        type: 'customer_details_released',
        title: 'Customer Details Released',
        message: `Customer details for task "${task.title}" have been released. You can now contact the customer. Work must commence within 24 hours.`,
        data: JSON.stringify({ 
          taskId, 
          quoteId: quote.id,
          customerDetails: {
            name: `${req.user.firstName} ${req.user.lastName}`,
            phone: req.user.phoneNumber,
            email: req.user.email,
            address: task.location
          }
        })
      });

      await sendNotificationToUser(serviceProvider.userId, notification);

      res.json(updatedQuote);
    } catch (err) {
      res.status(500).json({ message: "Failed to release customer details" });
    }
  });

  // Service Requests routes (creation handled later with enhanced call center workflow)
  
  app.get("/api/service-requests/client", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const requests = await storage.getServiceRequestsByClient(req.user.id);
      
      // Enhance requests with provider info
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          if (!request.providerId) return null;
          const providerWithDetails = await storage.getServiceProviderWithUser(request.providerId);
          
          if (!providerWithDetails) return null;
          
          return {
            ...request,
            provider: providerWithDetails
          };
        })
      );
      
      // Filter out null results
      res.json(requestsWithDetails.filter(r => r !== null));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service requests" });
    }
  });
  
  // Get approved service requests for current service provider (for map access)
  app.get("/api/service-requests/approved", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      if (req.user.role !== 'service_provider') {
        return res.status(403).json({ message: "Access denied. Service providers only." });
      }

      const serviceProvider = await storage.getServiceProviderByUserId(req.user.id);
      if (!serviceProvider) {
        return res.status(404).json({ message: "Service provider profile not found" });
      }

      const requests = await storage.getServiceRequestsByProvider(serviceProvider.id);
      const approvedRequests = requests.filter(r => r.status === 'call_center_approved');
      
      res.json(approvedRequests);
    } catch (error) {
      console.error('Error fetching approved service requests:', error);
      res.status(500).json({ message: "Failed to fetch approved service requests" });
    }
  });

  app.get("/api/service-requests/provider", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      // Get the provider profile for the current user
      const provider = await storage.getServiceProviderByUserId(req.user.id);
      
      if (!provider) {
        return res.status(404).json({ message: "Service provider profile not found" });
      }
      
      const requests = await storage.getServiceRequestsByProvider(provider.id);
      
      // Enhance requests with client info
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          const client = await storage.getUser(request.clientId);
          
          if (!client) return null;
          
          return {
            ...request,
            client: {
              id: client.id,
              firstName: client.firstName,
              lastName: client.lastName,
              profilePicture: client.profilePicture
            }
          };
        })
      );
      
      // Filter out null results
      res.json(requestsWithDetails.filter(r => r !== null));
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch service requests" });
    }
  });
  
  app.put("/api/service-requests/:id", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const requestId = parseInt(req.params.id);
      const request = await storage.getServiceRequest(requestId);
      
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      // Get the provider profile for the current user
      const provider = await storage.getServiceProviderByUserId(req.user.id);
      
      // Check if user is either the client, provider, or call center staff
      const isCallCenterStaff = req.user.role === 'call_center';
      const isClient = request.clientId === req.user.id;
      const isProvider = provider && provider.id === request.providerId;
      
      if (!isClient && !isProvider && !isCallCenterStaff) {
        return res.status(403).json({ message: "You can only update your own requests" });
      }
      
      const updatedRequest = await storage.updateServiceRequest(requestId, req.body);
      
      // If call center staff approved the request, send full address details to provider
      if (isCallCenterStaff && req.body.status === 'call_center_approved' && updatedRequest && updatedRequest.providerId) {
        // Get task details with full address
        const task = await storage.getTask(updatedRequest.taskId);
        const client = await storage.getUser(updatedRequest.clientId);
        
        if (task && client) {
          // Get provider user details
          const providerUser = provider ? await storage.getUser(provider.userId) : null;
          
          if (providerUser) {
            // Send notification with full address details to provider
            const addressNotification = await storage.createNotification({
              userId: providerUser.id,
              type: 'service_approved',
              title: 'Service Request Approved - Address Details',
              message: `Your service request for "${task.title}" has been approved by call center. Address: ${task.location}`,
              data: JSON.stringify({ 
                taskId: task.id,
                serviceRequestId: requestId,
                hasAddress: true,
                clientInfo: {
                  name: `${client.firstName} ${client.lastName}`,
                  phone: client.phoneNumber,
                  email: client.email
                },
                taskDetails: {
                  title: task.title,
                  description: task.description,
                  location: task.location,
                  latitude: task.latitude,
                  longitude: task.longitude,
                  budget: task.budget
                }
              })
            });
            
            // Send real-time notification
            await sendNotificationToUser(providerUser.id, addressNotification);
          }
        }
      }
      
      res.json(updatedRequest);
    } catch (err) {
      res.status(500).json({ message: "Failed to update service request" });
    }
  });

  // Reviews routes
  app.post("/api/reviews", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      // Verify the service request exists and belongs to this user
      const request = await storage.getServiceRequest(req.body.serviceRequestId);
      
      if (!request) {
        return res.status(404).json({ message: "Service request not found" });
      }
      
      if (request.clientId !== req.user.id) {
        return res.status(403).json({ message: "You can only review your own service requests" });
      }
      
      // Only allow reviews for completed requests
      if (request.status !== "completed") {
        return res.status(400).json({ message: "You can only review completed service requests" });
      }
      
      const reviewData = insertReviewSchema.parse({
        ...req.body,
        clientId: req.user.id,
        providerId: request.providerId
      });
      
      const review = await storage.createReview(reviewData);
      res.status(201).json(review);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: err.errors 
        });
      }
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  // Profile picture update route
  app.put("/api/user/profile-picture", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const { profilePicture } = req.body;
      
      
      
      const updatedUser = await storage.updateUser(req.user.id, {
        profilePicture: profilePicture || null
      });
      
      if (!updatedUser) {
      
        return res.status(404).json({ message: "User not found" });
      }
      
      
      res.json(updatedUser);
    } catch (err) {
      const error = err as Error;
      console.error('Error updating profile picture:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ message: "Failed to update profile picture", error: error.message });
    }
  });

  // Change password route
  app.put("/api/user/change-password", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }

      // Get current user
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify current password (import comparePasswords from auth.ts)
      const { comparePasswords, hashPassword } = await import('./auth');
      const isCurrentPasswordValid = await comparePasswords(currentPassword, user.password);
      
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(newPassword);
      
      // Update password
      const updatedUser = await storage.updateUser(req.user.id, {
        password: hashedNewPassword
      });
      
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update password" });
      }
      
      res.json({ message: "Password changed successfully" });
    } catch (err) {
      const error = err as Error;
      console.error('Error changing password:', error.message);
      res.status(500).json({ message: "Failed to change password", error: error.message });
    }
  });

  // Get provider documents
  app.get("/api/provider/documents/:providerId", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const providerId = parseInt(req.params.providerId);
      
      // Check if user owns this provider profile or is admin/verifier
      const provider = await storage.getServiceProvider(providerId);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      
      if (provider.userId !== req.user.id && !['admin', 'service_verifier'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const documents = await storage.getServiceProviderDocuments(providerId);
      res.json(documents);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Upload provider document
  app.post("/api/provider/documents", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const { providerId, documentType, documentUrl, originalName } = req.body;

      // Check if user owns this provider profile
      const provider = await storage.getServiceProvider(providerId);
      if (!provider || provider.userId !== req.user.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const document = await storage.createServiceProviderDocument({
        providerId,
        documentType,
        documentUrl,
        originalName,
        verificationStatus: 'pending'
      });

      res.json(document);
    } catch (err) {
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Update provider document (for reuploads)
  app.put("/api/provider/documents/:documentId", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const documentId = parseInt(req.params.documentId);
      const { documentUrl, originalName, verificationStatus, notes } = req.body;


      // Get the document to check ownership
      const document = await storage.getServiceProviderDocument(documentId);
      if (!document) {
        
        return res.status(404).json({ message: "Document not found" });
      }

      

      // Check if user owns this document
      const provider = await storage.getServiceProvider(document.providerId);
      if (!provider || provider.userId !== req.user.id) {
        
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedDocument = await storage.updateServiceProviderDocument(documentId, {
        documentUrl,
        originalName,
        verificationStatus,
        notes,
        verifiedBy: null, // Clear previous verification
        verifiedAt: null
      });

      res.json(updatedDocument);
    } catch (err) {
      console.error('❌ Error updating document:', err);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // Get provider documents (for current user)
  app.get("/api/user/provider/documents", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const provider = await storage.getServiceProviderByUserId(req.user.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }
      
      const documents = await storage.getServiceProviderDocuments(provider.id);
      res.json(documents);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  // Document verification routes for admins and service verifiers
  app.get("/api/admin/documents/pending", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    if (!['admin', 'service_verifier'].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Admin or service verifier role required." });
    }

    try {
      const query = `
        SELECT spd.*, sp.user_id, u.first_name, u.last_name, u.email, sp.bio
        FROM service_provider_documents spd
        JOIN service_providers sp ON spd.provider_id = sp.id
        JOIN users u ON sp.user_id = u.id
        WHERE spd.verification_status IN ('pending', 'under_review')
        ORDER BY spd.uploaded_at ASC
      `;
      
      const result = await pool.query(query);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch pending documents" });
    }
  });

  // Verify or reject document
  app.put("/api/admin/documents/:documentId/verify", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    if (!['admin', 'service_verifier'].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Admin or service verifier role required." });
    }

    try {
      const documentId = parseInt(req.params.documentId);
      const { status, notes } = req.body;

      if (!['approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Must be 'approved' or 'rejected'" });
      }

      const updatedDocument = await storage.updateServiceProviderDocument(documentId, {
        verificationStatus: status,
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
        notes: notes || null
      });

      if (!updatedDocument) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Send notification to provider
      const providerQuery = `
        SELECT sp.user_id FROM service_provider_documents spd
        JOIN service_providers sp ON spd.provider_id = sp.id
        WHERE spd.id = $1
      `;
      const providerResult = await pool.query(providerQuery, [documentId]);
      
      if (providerResult.rows.length > 0) {
        const providerId = providerResult.rows[0].user_id;
        const notification = await storage.createNotification({
          userId: providerId,
          type: 'document_verification',
          title: `Document ${status === 'approved' ? 'Approved' : 'Rejected'}`,
          message: `Your ${updatedDocument.documentType} document has been ${status}. ${notes ? 'Notes: ' + notes : ''}`,
          data: JSON.stringify({ documentId, status, notes })
        });

        await sendNotificationToUser(providerId, notification);
      }

      res.json(updatedDocument);
    } catch (err) {
      res.status(500).json({ message: "Failed to verify document" });
    }
  });

  // Serve document (for viewing base64 documents)
  app.get("/api/documents/:documentId/view", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const documentId = parseInt(req.params.documentId);
      
      // Get document from database
      const document = await storage.getServiceProviderDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Get provider to check permissions
      const provider = await storage.getServiceProvider(document.providerId);
      if (!provider) {
        return res.status(404).json({ message: "Provider not found" });
      }

      // Check if user has permission to view this document
      if (provider.userId !== req.user.id && !['admin', 'service_verifier'].includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Check if document URL is a base64 data URL
      if (!document.documentUrl || !document.documentUrl.startsWith('data:')) {
        return res.status(404).json({ message: "Document not available" });
      }

      // Extract content type and base64 data
      const matches = document.documentUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ message: "Invalid document format" });
      }

      const [, contentType, base64Data] = matches;
      
      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Set appropriate headers
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', buffer.length);
      res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
      
      // Send the document
      res.send(buffer);
    } catch (err) {
      console.error('Error serving document:', err);
      res.status(500).json({ message: "Failed to serve document" });
    }
  });

  // Admin middleware
  const requireAdmin = (req: any, res: Response, next: NextFunction) => {
    if (!req.user || req.user.email !== 'findmyhelper2025@gmail.com') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  };

  // Admin routes
  app.get('/api/admin/staff', async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.email !== 'findmyhelper2025@gmail.com') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const staffUsers = await storage.getStaffUsers();
      res.json(staffUsers);
    } catch (error) {
      console.error('Error fetching staff users:', error);
      res.status(500).json({ message: 'Failed to fetch staff users' });
    }
  });

  app.post('/api/admin/create-user', async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.email !== 'findmyhelper2025@gmail.com') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      // Use insertUserSchema for all staff roles (service_verifier, call_center, payment_approver)
      const validatedData = insertUserSchema.parse(req.body);
      
      // Only allow creating service_verifier, call_center, and payment_approver roles
      if (!['service_verifier', 'call_center', 'payment_approver'].includes(validatedData.role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
      }
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username) || 
                          await storage.getUserByEmail(validatedData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: 'Username or email already exists' });
      }

      // Hash the password before creating the user
      const hashedPassword = await hashPassword(validatedData.password);
      
      // Set createdBy to admin user ID
      const userWithCreator = {
        ...validatedData,
        password: hashedPassword,
        createdBy: req.user.id
      };

      const user = await storage.createUser(userWithCreator);
      
      // Remove password from response
      const { password, ...userResponse } = user;
      res.status(201).json(userResponse);
    } catch (error: any) {
      console.error('Error creating user:', error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: 'Invalid user data', errors: error.errors });
      }
      res.status(500).json({ message: 'Failed to create user' });
    }
  });

  // Get all users for admin
  app.get('/api/admin/users', async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.email !== 'findmyhelper2025@gmail.com') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const allUsers = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = allUsers.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(safeUsers);
    } catch (error) {
      console.error('Error fetching all users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.delete('/api/admin/users/:id', async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.email !== 'findmyhelper2025@gmail.com') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    
    try {
      const userId = parseInt(req.params.id);
      
      // Prevent admin from deleting themselves
      if (userId === req.user.id) {
        return res.status(400).json({ message: 'Cannot delete your own account' });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Only allow deleting service_verifier, call_center, and payment_approver roles
      if (!['service_verifier', 'call_center', 'payment_approver'].includes(user.role)) {
        return res.status(400).json({ message: 'Can only delete staff accounts' });
      }
      
      const deleted = await storage.deleteUser(userId);
      if (!deleted) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // Notification endpoints
  app.get("/api/notifications", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const notifications = await storage.getNotifications(req.user.id);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const notifications = await storage.getUnreadNotifications(req.user.id);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const success = await storage.markNotificationAsRead(parseInt(req.params.id));
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch("/api/notifications/read-all", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      await storage.markAllNotificationsAsRead(req.user.id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Test endpoint to check database connection
  app.get("/api/test/db", async (req, res) => {
    try {
      const result = await pool.query('SELECT COUNT(*) FROM service_providers');
      res.json({ status: "Database connection working", count: result.rows[0].count });
    } catch (error) {
      const err = error as Error;
      res.status(500).json({ error: "Database connection failed", message: err.message });
    }
  });

  // Test user info endpoint 
  app.get("/api/test/user", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    req.user = req.session.user;
    res.json({ 
      debug: true, 
      userId: req.user?.id,
      userRole: req.user?.role,
      userExists: !!req.user
    });
  });

  // Debug endpoint to check and fix admin user
  app.get("/api/debug/admin", async (req, res) => {
    try {
      const adminEmail = "findmyhelper2025@gmail.com";
      const admin = await storage.getUserByEmail(adminEmail);
      
      if (!admin) {
        return res.json({ 
          message: "Admin user not found",
          shouldCreate: true 
        });
      }
      
      // Check if password format is correct (should be salt:hash format)
      const hasCorrectFormat = admin.password.includes(':');
      
      return res.json({
        message: "Admin user found",
        admin: {
          id: admin.id,
          email: admin.email,
          role: admin.role,
          hasCorrectPasswordFormat: hasCorrectFormat
        },
        shouldFixPassword: !hasCorrectFormat
      });
    } catch (error) {
      console.error('Error checking admin user:', error);
      res.status(500).json({ message: "Error checking admin user" });
    }
  });

  // Reset admin user password endpoint
  app.post("/api/debug/reset-admin", async (req, res) => {
    try {
      const adminEmail = "findmyhelper2025@gmail.com";
      const admin = await storage.getUserByEmail(adminEmail);
      
      if (!admin) {
        // Create admin user
        const { hashPassword } = await import('./auth');
        const password = "Fmh@2025";
        const hashedPassword = hashPassword(password);
        
        await storage.createUser({
          email: adminEmail,
          username: "admin",
          password: hashedPassword,
          firstName: "Admin",
          lastName: "User",
          role: "admin",
          isEmailVerified: true
        });
        
        return res.json({ 
          message: "Admin user created successfully",
          credentials: {
            email: adminEmail,
            password: password
          }
        });
      } else {
        // Update existing admin password
        const { hashPassword } = await import('./auth');
        const password = "Fmh@2025";
        const hashedPassword = hashPassword(password);
        
        await storage.updateUser(admin.id, {
          password: hashedPassword,
          isEmailVerified: true
        });
        
        return res.json({ 
          message: "Admin password reset successfully",
          credentials: {
            email: adminEmail,
            password: password
          }
        });
      }
    } catch (error) {
      console.error('Error resetting admin user:', error);
      res.status(500).json({ message: "Error resetting admin user" });
    }
  });

  // Debug endpoint to fix admin user password
  app.post("/api/debug/fix-admin", async (req, res) => {
    try {
      const adminEmail = "findmyhelper2025@gmail.com";
      const admin = await storage.getUserByEmail(adminEmail);
      
      if (!admin) {
        return res.status(404).json({ message: "Admin user not found" });
      }
      
      // Import password hashing function
      const { hashPassword } = await import('./auth');
      
      // Update admin password to correct format
      const newPassword = "Fmh@2025";
      const hashedPassword = hashPassword(newPassword);
      
      await storage.updateUser(admin.id, {
        password: hashedPassword,
        isEmailVerified: true
      });
      
      res.json({ 
        message: "Admin user password fixed successfully",
        newPassword: "Fmh@2025"
      });
    } catch (error) {
      res.status(500).json({ 
        message: "Error fixing admin user",
        error: error.message 
      });
    }
  });

  // Get current user's service provider profile
  app.get("/api/providers/me", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      
      const result = await pool.query('SELECT * FROM service_providers WHERE user_id = $1', [req.user.id]);
      
      
      
      if (result.rows.length === 0) {
        
        return res.status(404).json({ message: "Service provider profile not found" });
      }
      
      const row = result.rows[0];
      const provider = {
        id: row.id,
        userId: row.user_id,
        categoryId: row.category_id,
        bio: row.bio,
        hourlyRate: row.hourly_rate,
        yearsOfExperience: row.years_of_experience,
        availability: row.availability,
        rating: row.rating,
        completedJobs: row.completed_jobs,
        verificationStatus: row.verification_status,
        verifiedBy: row.verified_by,
        verifiedAt: row.verified_at,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      };
      
      
      res.json(provider);
    } catch (error) {
      const err = error as Error;
      console.error('Database error in /api/providers/me:', err);
      console.error('Error stack:', err.stack);
      res.status(500).json({ message: "Database error", error: err.message });
    }
  });

  // Update current user's service provider profile
  app.put("/api/providers/me", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const { categoryId, hourlyRate, bio, experience } = req.body;
      
      // Validate required fields
      if (!categoryId || !hourlyRate || !bio) {
        return res.status(400).json({ message: "Category, hourly rate, and bio are required" });
      }
      
      
      const serviceProvider = await storage.getServiceProviderByUserId(req.user.id);
      
      
      if (!serviceProvider) {
        
        
        // Try to create a provider profile if it doesn't exist
        try {
          
          const newProviderData = {
            userId: req.user.id,
            categoryId: parseInt(categoryId),
            hourlyRate: parseFloat(hourlyRate),
            bio: bio || "",
            yearsOfExperience: experience ? parseInt(experience) : null,
            availability: "",
            rating: 0,
            completedJobs: 0,
            isVerified: false
          };
          
          const createdProvider = await storage.createServiceProvider(newProviderData);
          
          
          res.json(createdProvider);
          return;
        } catch (createError) {
          console.error('Failed to create provider profile:', createError);
          return res.status(404).json({ message: "Service provider profile not found and could not be created" });
        }
      }
      
      const updatedProvider = await storage.updateServiceProvider(serviceProvider.id, {
        categoryId: parseInt(categoryId),
        hourlyRate: parseFloat(hourlyRate),
        bio,
        yearsOfExperience: experience ? parseInt(experience) : null
      });
      
      
      res.json(updatedProvider);
    } catch (error) {
      console.error('Error updating service provider profile:', error);
      res.status(500).json({ message: "Failed to update service provider profile" });
    }
  });

  // Location-based service provider search
  app.get("/api/providers/nearby", async (req, res) => {
    try {
      const { lat, lng, radius = 10, categoryId } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const searchRadius = parseFloat(radius as string);
      const category = categoryId ? parseInt(categoryId as string) : undefined;
      
      const providers = await storage.getNearbyServiceProviders(latitude, longitude, searchRadius, category);
      res.json(providers);
    } catch (err) {
      res.status(500).json({ message: "Failed to search nearby providers" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections by user ID
  const userConnections = new Map<number, Set<WebSocket>>();
  
  wss.on('connection', (ws, req) => {
    let userId: number | null = null;
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'authenticate' && data.userId) {
          userId = data.userId;
          
          if (!userConnections.has(userId)) {
            userConnections.set(userId, new Set());
          }
          userConnections.get(userId)!.add(ws);
          
          ws.send(JSON.stringify({ type: 'authenticated', success: true }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });
    
    ws.on('close', () => {
      if (userId && userConnections.has(userId)) {
        userConnections.get(userId)!.delete(ws);
        if (userConnections.get(userId)!.size === 0) {
          userConnections.delete(userId);
        }
      }
    });
  });

  // Function to send notifications to connected clients
  async function sendNotificationToUser(userId: number, notification: any) {
    const connections = userConnections.get(userId);
    if (connections) {
      const message = JSON.stringify({
        type: 'notification',
        data: notification
      });
      
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  }

  // Enhanced task creation with location-based notifications
  app.post("/api/tasks", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const taskData = insertTaskSchema.parse({
        ...req.body,
        clientId: req.user.id
      });
      
      const task = await storage.createTask(taskData);
      
      // Find nearby service providers
      const nearbyProviders = await storage.getNearbyServiceProviders(
        task.latitude, 
        task.longitude, 
        10, // 10km radius
        task.categoryId
      );
      
      // Create privacy-protected notifications for nearby providers
      // Only send to providers with approved banking details (fully verified)
      const notifications = await Promise.all(
        nearbyProviders.map(async (provider: any) => {
          // Check if provider has all 3 required approved documents
          const documents = await storage.getServiceProviderDocuments(provider.id);
          const approvedDocs = documents.filter(doc => doc.verificationStatus === "approved");
          
          const hasApprovedIdentity = approvedDocs.some(doc => 
            doc.documentType === "identity" || doc.documentType === "drivers_license"
          );
          const hasApprovedBankingDetails = approvedDocs.some(doc => 
            doc.documentType === "banking_details"
          );
          const hasApprovedLicense = approvedDocs.some(doc => 
            doc.documentType === "license" || doc.documentType === "certificate"
          );
          
          const isFullyVerified = hasApprovedIdentity && hasApprovedBankingDetails && hasApprovedLicense;
          
          // Only notify fully verified providers with banking details
          if (!isFullyVerified) {
            return null; // Skip notification for unverified providers
          }
          
          // Calculate approximate distance for privacy
          const distance = calculateDistance(task.latitude, task.longitude, provider.latitude, provider.longitude);
          const approximateDistance = `~${Math.round(distance)}km away`;
          
          const notification = await storage.createNotification({
            userId: provider.userId,
            type: 'task_posted',
            title: 'New Task Available',
            message: `Task: "${task.title}" - ${approximateDistance}. Address details available after call center approval.`,
            data: JSON.stringify({ 
              taskId: task.id, 
              distance: approximateDistance,
              hasAddress: false // Indicates address not included for privacy
            })
          });
          
          // Send real-time notification
          await sendNotificationToUser(provider.userId, notification);
          return notification;
        })
      ).then(results => results.filter(notification => notification !== null));
      
      res.status(201).json({ task, notificationsSent: notifications.length });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: err.errors 
        });
      }
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  // Enhanced service request handling with call center workflow
  app.post("/api/service-requests", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    try {
      const requestData = insertServiceRequestSchema.parse({
        ...req.body,
        clientId: req.user.id,
        status: 'assigned_to_call_center' // Auto-assign to call center
      });
      
      const serviceRequest = await storage.createServiceRequest(requestData);
      
      // Get all call center users
      const callCenterUsers = await storage.getStaffUsers();
      const callCenterStaff = callCenterUsers.filter(user => user.role === 'call_center');
      
      if (callCenterStaff.length > 0) {
        // Assign to first available call center user (you can implement load balancing)
        const assignedUser = callCenterStaff[0];
        
        // Update service request with call center assignment
        await storage.updateServiceRequest(serviceRequest.id, {
          assignedToCallCenter: assignedUser.id,
          assignedAt: new Date()
        });
        
        // Create notification for call center user
        const notification = await storage.createNotification({
          userId: assignedUser.id,
          type: 'call_center_assignment',
          title: 'New Service Request Assignment',
          message: 'A new service request has been assigned to you for provider contact',
          data: JSON.stringify({ serviceRequestId: serviceRequest.id })
        });
        
        // Send real-time notification
        await sendNotificationToUser(assignedUser.id, notification);
      }
      
      res.status(201).json(serviceRequest);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: err.errors 
        });
      }
      res.status(500).json({ message: "Failed to create service request" });
    }
  });

  // Store the notification function globally so it can be used elsewhere
  (global as any).sendNotificationToUser = sendNotificationToUser;

  // ========== PAYMENT SYSTEM ROUTES ==========

  // Admin/Payment Approver middleware
  const requirePaymentApprover = (req: any, res: Response, next: NextFunction) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    if (req.user.role !== userRoles.PAYMENT_APPROVER && req.user.role !== userRoles.ADMIN) {
      return res.status(403).json({ message: "Payment approver access required" });
    }
    next();
  };

  // Create payment intent for service request
  app.post("/api/payments/create-intent", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const { serviceRequestId, amount } = req.body;

      // Validate service request exists and belongs to user
      const serviceRequest = await storage.getServiceRequest(serviceRequestId);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }
      if (serviceRequest.clientId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized for this service request" });
      }

      // Check if payment already exists
      const existingPayment = await storage.getEscrowPaymentByServiceRequest(serviceRequestId);
      if (existingPayment) {
        return res.status(400).json({ message: "Payment already exists for this service request" });
      }

      // Get provider details
      const provider = await storage.getServiceProvider(serviceRequest.providerId);
      if (!provider) {
        return res.status(404).json({ message: "Service provider not found" });
      }

      // Calculate fees
      const baseAmount = parseFloat(amount);
      const platformFee = baseAmount * PLATFORM_FEE_PERCENTAGE;
      const tax = baseAmount * TAX_RATE;
      const totalAmount = baseAmount + platformFee + tax;
      const payoutAmount = baseAmount - platformFee;

      // Create Stripe Payment Intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(totalAmount * 100), // Convert to cents
        currency: 'usd',
        metadata: {
          serviceRequestId: serviceRequestId.toString(),
          clientId: req.user.id.toString(),
          providerId: provider.id.toString()
        }
      });

      // Create escrow payment record
      const escrowPayment = await storage.createEscrowPayment({
        serviceRequestId,
        clientId: req.user.id,
        providerId: provider.id,
        stripePaymentIntentId: paymentIntent.id,
        amount: baseAmount,
        platformFee,
        tax,
        totalAmount,
        payoutAmount,
        status: paymentStatuses.PENDING
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        paymentId: escrowPayment.id,
        breakdown: {
          amount: baseAmount,
          platformFee,
          tax,
          totalAmount,
          payoutAmount
        }
      });
    } catch (error) {
      console.error('Payment intent creation error:', error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  // Confirm payment and hold in escrow
  app.post("/api/payments/confirm", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const { paymentId } = req.body;

      const payment = await storage.getEscrowPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      if (payment.clientId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized for this payment" });
      }

      // Verify payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({ message: "Payment not completed" });
      }

      // Update payment status to held
      await storage.updateEscrowPayment(paymentId, {
        status: paymentStatuses.HELD,
        heldAt: new Date()
      });

      // Update service request status
      await storage.updateServiceRequest(payment.serviceRequestId, {
        status: 'payment_held'
      });

      res.json({ message: "Payment confirmed and held in escrow" });
    } catch (error) {
      console.error('Payment confirmation error:', error);
      res.status(500).json({ message: "Failed to confirm payment" });
    }
  });

  // Provider submits work completion photos
  app.post("/api/payments/submit-work", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const { serviceRequestId, photos } = req.body;

      // Validate service request
      const serviceRequest = await storage.getServiceRequest(serviceRequestId);
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }

      // Verify user is the assigned provider
      const provider = await storage.getServiceProviderByUserId(req.user.id);
      if (!provider || provider.id !== serviceRequest.providerId) {
        return res.status(403).json({ message: "Not authorized for this service request" });
      }

      // Check if payment is held
      const payment = await storage.getEscrowPaymentByServiceRequest(serviceRequestId);
      if (!payment || payment.status !== paymentStatuses.HELD) {
        return res.status(400).json({ message: "Payment not held for this service request" });
      }

      // Save work completion photos
      const photoRecords = await Promise.all(
        photos.map(async (photo: any) => {
          return await storage.createWorkCompletionPhoto({
            serviceRequestId,
            providerId: provider.id,
            photoUrl: photo.url,
            originalName: photo.originalName,
            description: photo.description
          });
        })
      );

      // Update service request status
      await storage.updateServiceRequest(serviceRequestId, {
        status: 'work_completed'
      });

      // Update payment status to awaiting approval
      await storage.updateEscrowPayment(payment.id, {
        status: paymentStatuses.APPROVED
      });

      // Notify payment approvers
      const users = await storage.getAllUsers();
      const paymentApprovers = users.filter(user => 
        user.role === userRoles.PAYMENT_APPROVER || user.role === userRoles.ADMIN
      );

      const notifications = await Promise.all(
        paymentApprovers.map(async (approver) => {
          const notification = await storage.createNotification({
            userId: approver.id,
            type: 'payment_approval_required',
            title: 'Payment Approval Required',
            message: `Work completion submitted for service request #${serviceRequestId}`,
            data: JSON.stringify({ serviceRequestId, paymentId: payment.id })
          });
          await sendNotificationToUser(approver.id, notification);
          return notification;
        })
      );

      res.json({ 
        message: "Work completion submitted successfully",
        photos: photoRecords,
        notificationsSent: notifications.length
      });
    } catch (error) {
      console.error('Work submission error:', error);
      res.status(500).json({ message: "Failed to submit work completion" });
    }
  });

  // Get pending payment approvals (for payment approvers)
  app.get("/api/payments/pending", requirePaymentApprover, async (req, res) => {
    try {
      const pendingPayments = await storage.getPendingPayments();
      
      // Enrich with service request and user details
      const enrichedPayments = await Promise.all(
        pendingPayments.map(async (payment) => {
          const serviceRequest = await storage.getServiceRequest(payment.serviceRequestId);
          const client = await storage.getUser(payment.clientId);
          const provider = await storage.getServiceProvider(payment.providerId);
          const photos = await storage.getWorkCompletionPhotos(payment.serviceRequestId);

          return {
            ...payment,
            serviceRequest,
            client,
            provider,
            photos
          };
        })
      );

      res.json(enrichedPayments);
    } catch (error) {
      console.error('Pending payments fetch error:', error);
      res.status(500).json({ message: "Failed to fetch pending payments" });
    }
  });

  // Approve payment and release to provider
  app.post("/api/payments/approve", requirePaymentApprover, async (req, res) => {
    try {
      const { paymentId } = req.body;

      const payment = await storage.getEscrowPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      if (payment.status !== paymentStatuses.APPROVED) {
        return res.status(400).json({ message: "Payment not ready for approval" });
      }

      // Get provider bank account
      const bankAccount = await storage.getProviderBankAccount(payment.providerId);
      if (!bankAccount) {
        return res.status(400).json({ message: "Provider bank account not found" });
      }

      // Create Stripe transfer to provider
      const transfer = await stripe.transfers.create({
        amount: Math.round(payment.payoutAmount * 100),
        currency: 'usd',
        destination: bankAccount.stripeAccountId,
        metadata: {
          paymentId: paymentId.toString(),
          serviceRequestId: payment.serviceRequestId.toString()
        }
      });

      // Update payment status and add transfer details
      await storage.updateEscrowPayment(paymentId, {
        status: paymentStatuses.RELEASED,
        stripeTransferId: transfer.id,
        approvedBy: req.user.id,
        approvedAt: new Date(),
        releasedAt: new Date()
      });

      // Update service request status
      await storage.updateServiceRequest(payment.serviceRequestId, {
        status: 'completed_and_paid'
      });

      // Notify provider about payment release
      const provider = await storage.getServiceProvider(payment.providerId);
      if (provider) {
        const notification = await storage.createNotification({
          userId: provider.userId,
          type: 'payment_released',
          title: 'Payment Released',
          message: `Payment of $${payment.payoutAmount.toFixed(2)} has been released to your account`,
          data: JSON.stringify({ paymentId, amount: payment.payoutAmount })
        });
        await sendNotificationToUser(provider.userId, notification);
      }

      res.json({ message: "Payment approved and released to provider" });
    } catch (error) {
      console.error('Payment approval error:', error);
      res.status(500).json({ message: "Failed to approve payment" });
    }
  });

  // Reject payment and refund to client
  app.post("/api/payments/reject", requirePaymentApprover, async (req, res) => {
    try {
      const { paymentId, reason } = req.body;

      const payment = await storage.getEscrowPayment(paymentId);
      if (!payment) {
        return res.status(404).json({ message: "Payment not found" });
      }
      if (payment.status !== paymentStatuses.APPROVED) {
        return res.status(400).json({ message: "Payment not ready for rejection" });
      }

      // Create Stripe refund
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        reason: 'requested_by_customer',
        metadata: {
          paymentId: paymentId.toString(),
          rejectionReason: reason
        }
      });

      // Update payment status
      await storage.updateEscrowPayment(paymentId, {
        status: paymentStatuses.REFUNDED,
        approvedBy: req.user.id,
        approvedAt: new Date(),
        refundedAt: new Date()
      });

      // Update service request status
      await storage.updateServiceRequest(payment.serviceRequestId, {
        status: 'disputed_and_refunded'
      });

      // Notify client about refund
      const notification = await storage.createNotification({
        userId: payment.clientId,
        type: 'payment_refunded',
        title: 'Payment Refunded',
        message: `Your payment of $${payment.totalAmount.toFixed(2)} has been refunded. Reason: ${reason}`,
        data: JSON.stringify({ paymentId, amount: payment.totalAmount, reason })
      });
      await sendNotificationToUser(payment.clientId, notification);

      res.json({ message: "Payment rejected and refunded to client" });
    } catch (error) {
      console.error('Payment rejection error:', error);
      res.status(500).json({ message: "Failed to reject payment" });
    }
  });

  // Provider bank account management
  app.post("/api/payments/bank-account", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const provider = await storage.getServiceProviderByUserId(req.user.id);
      if (!provider) {
        return res.status(404).json({ message: "Service provider profile not found" });
      }

      const { accountHolderName, bankName, accountNumber, routingNumber } = req.body;

      // Create Stripe Connect account for provider
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: req.user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        }
      });

      // Save bank account details
      const bankAccount = await storage.createProviderBankAccount({
        providerId: provider.id,
        stripeAccountId: account.id,
        accountHolderName,
        bankName,
        accountNumber: `****${accountNumber.slice(-4)}`, // Mask account number
        routingNumber,
        accountType: 'checking',
        isVerified: false
      });

      res.json({ 
        message: "Bank account added successfully",
        bankAccount: {
          id: bankAccount.id,
          accountHolderName: bankAccount.accountHolderName,
          bankName: bankAccount.bankName,
          accountNumber: bankAccount.accountNumber,
          isVerified: bankAccount.isVerified
        }
      });
    } catch (error) {
      console.error('Bank account creation error:', error);
      res.status(500).json({ message: "Failed to add bank account" });
    }
  });

  // Get provider bank account
  app.get("/api/payments/bank-account", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const provider = await storage.getServiceProviderByUserId(req.user.id);
      if (!provider) {
        return res.status(404).json({ message: "Service provider profile not found" });
      }

      const bankAccount = await storage.getProviderBankAccount(provider.id);
      if (!bankAccount) {
        return res.status(404).json({ message: "Bank account not found" });
      }

      res.json({
        id: bankAccount.id,
        accountHolderName: bankAccount.accountHolderName,
        bankName: bankAccount.bankName,
        accountNumber: bankAccount.accountNumber,
        isVerified: bankAccount.isVerified,
        isActive: bankAccount.isActive
      });
    } catch (error) {
      console.error('Bank account fetch error:', error);
      res.status(500).json({ message: "Failed to fetch bank account" });
    }
  });

  // ===============================
  // FIELDNATION-STYLE WORK ORDERS
  // ===============================

  // Create a work order (buyers post jobs)
  app.post("/api/work-orders", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const workOrderData = insertWorkOrderSchema.parse({
        ...req.body,
        clientId: req.user!.id
      });

      const workOrder = await storage.createWorkOrder(workOrderData);
      
      // Auto-notify providers within reasonable distance
      if (workOrder.latitude && workOrder.longitude) {
        const nearbyProviders = await storage.getServiceProvidersByLocation(
          workOrder.latitude,
          workOrder.longitude,
          25, // 25km radius
          workOrder.categoryId
        );

        // Send notifications to nearby providers
        for (const provider of nearbyProviders) {
          const distance = calculateDistance(
            workOrder.latitude,
            workOrder.longitude,
            provider.user.latitude || 0,
            provider.user.longitude || 0
          );

          const notification = await storage.createNotification({
            userId: provider.userId,
            type: 'new_work_order',
            title: 'New Work Order Available',
            message: `${workOrder.title} - ${distance.toFixed(1)}km away - Budget: $${workOrder.budget}`,
            data: JSON.stringify({ workOrderId: workOrder.id, distance })
          });
          
          await sendNotificationToUser(provider.userId, notification);
        }
      }

      res.status(201).json(workOrder);
    } catch (error) {
      console.error('Work order creation error:', error);
      res.status(400).json({ message: "Failed to create work order" });
    }
  });

  // Get work orders for buyers
  app.get("/api/work-orders/client", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const workOrders = await storage.getWorkOrdersByClient(req.user!.id);
      res.json(workOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work orders" });
    }
  });

  // Get available work orders for providers (privacy-protected)
  app.get("/api/work-orders/available", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      
      
      const provider = await storage.getServiceProviderByUserId(req.user!.id);
      if (!provider) {
      
        return res.status(404).json({ message: "Provider profile not found" });
      }

      // Get all tasks that are open
      const tasks = await storage.getTasks();
      
      
      // Filter tasks that match provider's category and are open
      const filteredTasks = tasks.filter(task => 
        task.categoryId === provider.categoryId && 
        task.status === 'open' &&
        task.clientId !== req.user!.id
      );

      // Convert tasks to work order format
      const workOrders = await Promise.all(filteredTasks.map(async (task) => {
        const client = await storage.getUser(task.clientId);
        const category = await storage.getServiceCategory(task.categoryId);
        
        return {
          id: task.id,
          title: task.title,
          description: task.description || '',
          jobType: 'task',
          budget: task.budget || null,
          isBudgetFlexible: false,
          estimatedDuration: task.estimatedDuration || null,
          experienceLevel: 'any',
          skillsRequired: '',
          status: task.status,
          createdAt: task.createdAt,
          allowBidding: true,
          category: category ? {
            id: category.id,
            name: category.name,
            description: category.description,
            icon: category.icon
          } : null,
          
          // Hide sensitive info until approval
          siteAddress: "Address will be provided after acceptance",
          clientPhoneNumber: "Contact info provided after acceptance",
          clientEmail: "Contact info provided after acceptance",
          
          // Show only city/state, not full address
          siteCity: task.location || 'Location TBD',
          siteState: 'State TBD',
          
          // Hide client personal details
          client: {
            firstName: "Client",
            lastName: "Name Hidden",
            // Don't expose personal info
          },
          
          // Calculate and show approximate distance only
          distance: null
        };
      }));

      
      res.json(workOrders);
    } catch (error) {
      console.error('❌ Error in available work orders endpoint:', error);
      res.status(500).json({ message: "Failed to fetch available work orders" });
    }
  });

  // Get specific work order with bids
  app.get("/api/work-orders/:id", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const workOrderId = parseInt(req.params.id);
      const workOrder = await storage.getWorkOrderWithDetails(workOrderId);
      
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Check if user has access to view this work order
      const provider = await storage.getServiceProviderByUserId(req.user!.id);
      const isOwner = workOrder.clientId === req.user!.id;
      const isProvider = provider && (
        workOrder.assignedProviderId === provider.id ||
        workOrder.bids.some(bid => bid.providerId === provider.id)
      );

      if (!isOwner && !isProvider && !['admin', 'call_center'].includes(req.user!.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(workOrder);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work order" });
    }
  });

  // ===============================
  // JOB BIDDING SYSTEM
  // ===============================

  // Submit a bid on a work order
  app.post("/api/work-orders/:id/bids", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const workOrderId = parseInt(req.params.id);
      const provider = await storage.getServiceProviderByUserId(req.user!.id);
      
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }

      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      if (!workOrder.allowBidding || workOrder.status !== 'open') {
        return res.status(400).json({ message: "Bidding not allowed on this work order" });
      }

      const bidData = insertJobBidSchema.parse({
        ...req.body,
        workOrderId,
        providerId: provider.id
      });

      const bid = await storage.createJobBid(bidData);

      // Notify client about new bid
      const notification = await storage.createNotification({
        userId: workOrder.clientId,
        type: 'new_bid',
        title: 'New Bid Received',
        message: `${provider.user.firstName} submitted a bid of $${bid.bidAmount} for "${workOrder.title}"`,
        data: JSON.stringify({ workOrderId, bidId: bid.id, bidAmount: bid.bidAmount })
      });
      
      await sendNotificationToUser(workOrder.clientId, notification);

      res.status(201).json(bid);
    } catch (error) {
      console.error('Bid creation error:', error);
      res.status(400).json({ message: "Failed to submit bid" });
    }
  });

  // Get bids for a work order (client view)
  app.get("/api/work-orders/:id/bids", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const workOrderId = parseInt(req.params.id);
      const workOrder = await storage.getWorkOrder(workOrderId);
      
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      // Only work order owner can view all bids
      if (workOrder.clientId !== req.user!.id && !['admin'].includes(req.user!.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const bids = await storage.getJobBidsByWorkOrder(workOrderId);
      res.json(bids);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bids" });
    }
  });

  // Provider accepts work order (creates service request for call center approval)
  app.post("/api/work-orders/:id/accept", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const workOrderId = parseInt(req.params.id);
      const provider = await storage.getServiceProviderByUserId(req.user!.id);
      
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }

      // Get the task (since we're using tasks, not work orders)
      const task = await storage.getTask(workOrderId);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      if (task.status !== 'open') {
        return res.status(400).json({ message: "Task is no longer available" });
      }

      // Check if provider already has a pending request for this task
      const existingRequest = await storage.getServiceRequestsByProvider(provider.id);
      const hasPendingRequest = existingRequest.some(req => 
        req.taskId === workOrderId && req.status === 'assigned_to_call_center'
      );

      if (hasPendingRequest) {
        return res.status(400).json({ message: "You already have a pending request for this task" });
      }

      // Create a service request that goes to call center for approval
      const serviceRequest = await storage.createServiceRequest({
        providerId: provider.id,
        taskId: workOrderId,
        clientId: task.clientId,
        status: 'assigned_to_call_center', // This will be reviewed by call center
        message: 'Provider interested in task - awaiting call center approval for client details'
      });

      // Notify call center staff for approval
      const callCenterStaff = await storage.getUsersByRole('call_center');
      for (const staff of callCenterStaff) {
        const notification = await storage.createNotification({
          userId: staff.id,
          type: 'approval_needed',
          title: 'Task Assignment Needs Approval',
          message: `Provider ${provider.user?.firstName || 'Unknown'} ${provider.user?.lastName || 'Provider'} wants to work on "${task.title}" - Review and approve to release client details`,
          data: JSON.stringify({ 
            serviceRequestId: serviceRequest.id, 
            taskId: workOrderId, 
            providerId: provider.id 
          })
        });
        
        await sendNotificationToUser(staff.id, notification);
      }

      // Notify client about provider interest (but not assigned yet)
      const clientNotification = await storage.createNotification({
        userId: task.clientId,
        type: 'task_interest',
        title: 'Provider Interested in Your Task',
        message: `A qualified provider has shown interest in your task "${task.title}". We're reviewing the match and will notify you once approved.`,
        data: JSON.stringify({ taskId: workOrderId, providerId: provider.id })
      });
      
      await sendNotificationToUser(task.clientId, clientNotification);

      res.json({ 
        message: "Task interest submitted successfully. Awaiting call center approval for client details.", 
        taskId: workOrderId,
        serviceRequestId: serviceRequest.id,
        status: 'pending_approval'
      });
    } catch (error) {
      console.error('Task acceptance error:', error);
      res.status(500).json({ message: "Failed to accept task" });
    }
  });

  // Call center approval endpoint - Release full client details to provider
  app.post("/api/call-center/assignments/:assignmentId/approve", async (req, res) => {
    if (!(req.session && req.session.user) || !['admin', 'call_center'].includes(req.user!.role)) {
      return res.status(403).json({ message: "Access denied. Call center staff only." });
    }

    try {
      const assignmentId = parseInt(req.params.assignmentId);
      const assignment = await storage.getCallCenterAssignment(assignmentId);
      
      if (!assignment) {
        return res.status(404).json({ message: "Assignment not found" });
      }

      if (assignment.status !== 'pending_approval') {
        return res.status(400).json({ message: "Assignment already processed" });
      }

      // Update assignment status
      await storage.updateCallCenterAssignment(assignmentId, {
        status: 'approved',
        handledBy: req.user!.id,
        handledAt: new Date()
      });

      // Now actually assign the work order
      await storage.updateWorkOrder(assignment.workOrderId, {
        assignedProviderId: assignment.providerId,
        status: 'assigned'
      });

      // Get full work order details for notifications
      const workOrder = await storage.getWorkOrderWithDetails(assignment.workOrderId);
      const provider = await storage.getServiceProvider(assignment.providerId);

      // Notify provider with FULL client details
      const providerNotification = await storage.createNotification({
        userId: provider.userId,
        type: 'work_approved',
        title: 'Work Assignment Approved - Client Details Released',
        message: `Your work assignment for "${workOrder.title}" has been approved. Client details: ${workOrder.client.firstName} ${workOrder.client.lastName}, ${workOrder.clientPhoneNumber}. Address: ${workOrder.siteAddress}, ${workOrder.siteCity}, ${workOrder.siteState}`,
        data: JSON.stringify({ 
          workOrderId: workOrder.id, 
          clientDetails: {
            name: `${workOrder.client.firstName} ${workOrder.client.lastName}`,
            phone: workOrder.clientPhoneNumber,
            email: workOrder.clientEmail,
            address: `${workOrder.siteAddress}, ${workOrder.siteCity}, ${workOrder.siteState}`
          }
        })
      });
      
      await sendNotificationToUser(provider.userId, providerNotification);

      // Notify client about final assignment
      const clientNotification = await storage.createNotification({
        userId: workOrder.clientId,
        type: 'work_assigned',
        title: 'Work Order Assigned',
        message: `Your work order "${workOrder.title}" has been assigned to ${provider.user.firstName} ${provider.user.lastName}. They will contact you soon to schedule the work.`,
        data: JSON.stringify({ workOrderId: workOrder.id, providerId: provider.id })
      });
      
      await sendNotificationToUser(workOrder.clientId, clientNotification);

      res.json({ message: "Work assignment approved and client details released to provider" });
    } catch (error) {
      console.error('Assignment approval error:', error);
      res.status(500).json({ message: "Failed to approve assignment" });
    }
  });

  // Accept a bid (assign work order to provider) - Legacy bidding system
  app.post("/api/work-orders/:workOrderId/bids/:bidId/accept", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const workOrderId = parseInt(req.params.workOrderId);
      const bidId = parseInt(req.params.bidId);

      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      if (workOrder.clientId !== req.user!.id) {
        return res.status(403).json({ message: "Only work order owner can accept bids" });
      }

      const bid = await storage.getJobBid(bidId);
      if (!bid || bid.workOrderId !== workOrderId) {
        return res.status(404).json({ message: "Bid not found" });
      }

      // Update work order and bid status
      await storage.updateWorkOrder(workOrderId, {
        assignedProviderId: bid.providerId,
        status: 'assigned',
        budget: bid.bidAmount
      });

      await storage.updateJobBid(bidId, {
        status: 'accepted'
      });

      // Reject other bids
      const otherBids = await storage.getJobBidsByWorkOrder(workOrderId);
      for (const otherBid of otherBids) {
        if (otherBid.id !== bidId && otherBid.status === 'pending') {
          await storage.updateJobBid(otherBid.id, { status: 'rejected' });
          
          // Notify rejected providers
          const notification = await storage.createNotification({
            userId: otherBid.provider.userId,
            type: 'bid_rejected',
            title: 'Bid Not Selected',
            message: `Your bid for "${workOrder.title}" was not selected`,
            data: JSON.stringify({ workOrderId, bidId: otherBid.id })
          });
          
          await sendNotificationToUser(otherBid.provider.userId, notification);
        }
      }

      // Notify winning provider
      const notification = await storage.createNotification({
        userId: bid.provider.userId,
        type: 'bid_accepted',
        title: 'Congratulations! Bid Accepted',
        message: `Your bid of $${bid.bidAmount} for "${workOrder.title}" has been accepted`,
        data: JSON.stringify({ workOrderId, bidId })
      });
      
      await sendNotificationToUser(bid.provider.userId, notification);

      res.json({ message: "Bid accepted successfully" });
    } catch (error) {
      console.error('Bid acceptance error:', error);
      res.status(500).json({ message: "Failed to accept bid" });
    }
  });

  // ===============================
  // PROVIDER SKILLS & EQUIPMENT
  // ===============================

  // Add provider skill
  app.post("/api/provider/skills", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const provider = await storage.getServiceProviderByUserId(req.user!.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }

      const skillData = insertProviderSkillSchema.parse({
        ...req.body,
        providerId: provider.id
      });

      const skill = await storage.createProviderSkill(skillData);
      res.status(201).json(skill);
    } catch (error) {
      res.status(400).json({ message: "Failed to add skill" });
    }
  });

  // Get provider skills
  app.get("/api/provider/skills/:providerId", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const skills = await storage.getProviderSkills(providerId);
      res.json(skills);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch skills" });
    }
  });

  // Add provider equipment
  app.post("/api/provider/equipment", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const provider = await storage.getServiceProviderByUserId(req.user!.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }

      const equipmentData = insertProviderEquipmentSchema.parse({
        ...req.body,
        providerId: provider.id
      });

      const equipment = await storage.createProviderEquipment(equipmentData);
      res.status(201).json(equipment);
    } catch (error) {
      res.status(400).json({ message: "Failed to add equipment" });
    }
  });

  // Get provider equipment
  app.get("/api/provider/equipment/:providerId", async (req, res) => {
    try {
      const providerId = parseInt(req.params.providerId);
      const equipment = await storage.getProviderEquipment(providerId);
      res.json(equipment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch equipment" });
    }
  });

  // Get provider's active work orders
  app.get("/api/provider/work-orders", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const provider = await storage.getServiceProviderByUserId(req.user!.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }

      const workOrders = await storage.getWorkOrdersByProvider(provider.id);
      res.json(workOrders);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch work orders" });
    }
  });

  // Update work order status (start, complete, etc.)
  app.patch("/api/work-orders/:id/status", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const workOrderId = parseInt(req.params.id);
      const { status } = req.body;

      const workOrder = await storage.getWorkOrder(workOrderId);
      if (!workOrder) {
        return res.status(404).json({ message: "Work order not found" });
      }

      const provider = await storage.getServiceProviderByUserId(req.user!.id);
      const isProvider = provider && workOrder.assignedProviderId === provider.id;
      const isClient = workOrder.clientId === req.user!.id;

      if (!isProvider && !isClient && !['admin'].includes(req.user!.role)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateData: any = { status };

      // Auto-set timestamps based on status
      if (status === 'in_progress') {
        updateData.actualStartTime = new Date();
      } else if (status === 'completed') {
        updateData.actualEndTime = new Date();
        updateData.completedAt = new Date();
      }

      await storage.updateWorkOrder(workOrderId, updateData);

      // Notify relevant parties
      const targetUserId = isProvider ? workOrder.clientId : workOrder.assignedProviderId;
      if (targetUserId) {
        const notification = await storage.createNotification({
          userId: targetUserId,
          type: 'work_order_status_update',
          title: 'Work Order Update',
          message: `Work order "${workOrder.title}" status changed to ${status}`,
          data: JSON.stringify({ workOrderId, status })
        });
        
        await sendNotificationToUser(targetUserId, notification);
      }

      res.json({ message: "Status updated successfully" });
    } catch (error) {
      console.error('Status update error:', error);
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  // Update current user's profile
  app.put("/api/user/profile", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const { firstName, lastName, email, phoneNumber } = req.body;
      const updatedUser = await storage.updateUser(req.user.id, {
        firstName,
        lastName,
        email,
        phoneNumber,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile", error: error.message });
    }
  });

  // Get current user's provider profile with category details
  app.get("/api/user/provider", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const provider = await storage.getServiceProviderByUserId(req.user.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }
      
      // Get category details
      const category = await storage.getServiceCategory(provider.categoryId);
      
      // Combine provider data with category and user info
      const providerWithDetails = {
        ...provider,
        category: category || null,
        user: {
          id: req.user.id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email,
          profilePicture: req.user.profilePicture
        }
      };
      
      res.json(providerWithDetails);
    } catch (err) {
      console.error('Error fetching provider profile:', err);
      res.status(500).json({ message: "Failed to fetch provider profile" });
    }
  });

  // Public admin reset endpoint (no authentication required)
  app.get("/api/public/reset-admin", async (req, res) => {
    try {
      const adminEmail = "findmyhelper2025@gmail.com";
      const admin = await storage.getUserByEmail(adminEmail);
      
      if (!admin) {
        // Create admin user
        const { hashPassword } = await import('./auth');
        const password = "Fmh@2025";
        const hashedPassword = hashPassword(password);
        
        await storage.createUser({
          email: adminEmail,
          username: "admin",
          password: hashedPassword,
          firstName: "Admin",
          lastName: "User",
          role: "admin",
          isEmailVerified: true
        });
        
        return res.json({ 
          message: "Admin user created successfully",
          credentials: {
            email: adminEmail,
            password: password
          }
        });
      } else {
        // Update existing admin password
        const { hashPassword } = await import('./auth');
        const password = "Fmh@2025";
        const hashedPassword = hashPassword(password);
        
        await storage.updateUser(admin.id, {
          password: hashedPassword,
          isEmailVerified: true
        });
        
        return res.json({ 
          message: "Admin password reset successfully",
          credentials: {
            email: adminEmail,
            password: password
          }
        });
      }
    } catch (error) {
      console.error('Error resetting admin user:', error);
      res.status(500).json({ 
        success: false,
        message: "Error resetting admin user",
        error: error.message 
      });
    }
  });

  // Service Verifier Dashboard Endpoints
  
  // Get recently verified providers
  app.get("/api/providers/recently-verified", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'service_verifier' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      
      
      // Get providers verified in the last 7 days
      const providers = await storage.getServiceProviders();
      
      const recentlyVerified = [];
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      for (const provider of providers) {
        if (provider.verificationStatus === 'verified' && 
            provider.verifiedAt && 
            new Date(provider.verifiedAt) >= sevenDaysAgo) {
          
          try {
            const user = await storage.getUser(provider.userId);
            
            if (user) {
              recentlyVerified.push({
                id: provider.id,
                userId: provider.userId,
                verificationStatus: provider.verificationStatus,
                verifiedAt: provider.verifiedAt,
                user: {
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email
                }
              });
            }
          } catch (error) {
            console.error(`Error processing verified provider ${provider.id}:`, error);
            // Continue with other providers
          }
        }
      }
      
      
      res.json(recentlyVerified);
    } catch (error) {
      console.error('❌ Error in recently verified endpoint:', error);
      res.status(500).json({ message: "Failed to fetch recently verified providers" });
    }
  });

  // Get verification statistics
  app.get("/api/verification/stats", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'service_verifier' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      
      const providers = await storage.getServiceProviders();
      
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const stats = {
        pending: providers.filter(p => p.verificationStatus === 'pending').length,
        verifiedToday: providers.filter(p => 
          p.verificationStatus === 'verified' && 
          p.verifiedAt && 
          new Date(p.verifiedAt) >= today
        ).length,
        totalVerified: providers.filter(p => p.verificationStatus === 'verified').length,
        rejected: providers.filter(p => p.verificationStatus === 'rejected').length
      };
      
      
      res.json(stats);
    } catch (error) {
      console.error('❌ Error fetching verification stats:', error);
      res.status(500).json({ message: "Failed to fetch verification stats" });
    }
  });

  // Update document verification status
  app.put("/api/verification/documents/:id", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'service_verifier' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const { id } = req.params;
      const { verificationStatus, notes, verifiedBy, verifiedAt } = req.body;
      
      const updated = await storage.updateServiceProviderDocument(parseInt(id), {
        verificationStatus,
        notes,
        verifiedBy,
        verifiedAt: new Date(verifiedAt)
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating document verification:', error);
      res.status(500).json({ message: "Failed to update document verification" });
    }
  });

  // Update provider verification status
  app.put("/api/providers/:id/verification", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'service_verifier' && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Access denied" });
    }
    
    try {
      const { id } = req.params;
      const { verificationStatus, rejectionReason, verifiedBy, verifiedAt } = req.body;
      
      const updated = await storage.updateServiceProvider(parseInt(id), {
        verificationStatus,
        rejectionReason,
        verifiedBy,
        verifiedAt: new Date(verifiedAt)
      });
      
      if (!updated) {
        return res.status(404).json({ message: "Provider not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error('Error updating provider verification:', error);
      res.status(500).json({ message: "Failed to update provider verification" });
    }
  });

  // Test endpoint to create a provider with pending verification (for testing)
  app.post("/api/test/create-pending-provider", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      // Create a test user
      const testUser = await storage.createUser({
        email: `test-provider-${Date.now()}@example.com`,
        username: `testprovider${Date.now()}`,
        password: 'hashedpassword',
        firstName: 'Test',
        lastName: 'Provider',
        role: 'service_provider',
        isEmailVerified: true
      });
      
      // Create a test provider with pending verification
      const testProvider = await storage.createServiceProvider({
        userId: testUser.id,
        categoryId: 1, // Assuming category 1 exists
        hourlyRate: 25.0,
        bio: 'Test provider for verification',
        yearsOfExperience: 2,
        availability: 'Weekdays',
        verificationStatus: 'pending'
      });
      
      // Create some test documents
      await storage.createServiceProviderDocument({
        providerId: testProvider.id,
        documentType: 'identity',
        documentUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        originalName: 'test-id.png',
        verificationStatus: 'pending'
      });
      
      await storage.createServiceProviderDocument({
        providerId: testProvider.id,
        documentType: 'license',
        documentUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A',
        originalName: 'test-license.jpg',
        verificationStatus: 'pending'
      });
      
      res.json({ 
        message: 'Test provider created successfully',
        provider: testProvider,
        user: testUser
      });
    } catch (error) {
      console.error('Error creating test provider:', error);
      res.status(500).json({ message: "Failed to create test provider" });
    }
  });

  // Debug endpoint to check raw database data
  app.get("/api/debug/providers-raw", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const providers = await storage.getServiceProviders();
      const users = await storage.getAllUsers();
      const documents = await Promise.all(
        providers.map(p => storage.getServiceProviderDocuments(p.id))
      );
      
      res.json({
        providers: providers.map(p => ({
          id: p.id,
          userId: p.userId,
          verificationStatus: p.verificationStatus,
          categoryId: p.categoryId
        })),
        users: users.map(u => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          role: u.role
        })),
        documents: documents.flat().map(d => ({
          id: d.id,
          providerId: d.providerId,
          documentType: d.documentType,
          verificationStatus: d.verificationStatus
        }))
      });
    } catch (error) {
      console.error('Error fetching raw data:', error);
      res.status(500).json({ message: "Failed to fetch raw data" });
    }
  });

  // Simple test endpoint to check individual queries
  app.get("/api/debug/test-queries", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      
      
      // Test 1: Get all providers
      const providers = await storage.getServiceProviders();
      
      
      // Test 2: Get first provider's user
      if (providers.length > 0) {
        const firstProvider = providers[0];
        
        
        const user = await storage.getUser(firstProvider.userId);
        
        
        const category = await storage.getServiceCategory(firstProvider.categoryId);
        
        
        const documents = await storage.getServiceProviderDocuments(firstProvider.id);
        
        
        res.json({
          success: true,
          providerCount: providers.length,
          firstProvider: {
            id: firstProvider.id,
            userId: firstProvider.userId,
            categoryId: firstProvider.categoryId,
            verificationStatus: firstProvider.verificationStatus,
            hasUser: !!user,
            hasCategory: !!category,
            documentCount: documents.length
          }
        });
      } else {
        res.json({
          success: true,
          providerCount: 0,
          message: 'No providers found'
        });
      }
    } catch (error) {
      console.error('❌ Test query failed:', error);
      res.status(500).json({ 
        success: false,
        error: error.message,
        stack: error.stack
      });
    }
  });

  // Simple test endpoint
  app.get("/api/test-simple", async (req, res) => {
    
    res.json({ message: "Test endpoint working", timestamp: new Date().toISOString() });
  });

  // Test endpoint to verify document serving
  app.get("/api/test/document/:documentId", async (req, res) => {
    try {
      const documentId = parseInt(req.params.documentId);
      
      // Get document from database
      const document = await storage.getServiceProviderDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      res.json({
        id: document.id,
        documentType: document.documentType,
        originalName: document.originalName,
        hasDataUrl: document.documentUrl && document.documentUrl.startsWith('data:'),
        urlLength: document.documentUrl ? document.documentUrl.length : 0
      });
    } catch (err) {
      console.error('Error testing document:', err);
      res.status(500).json({ message: "Failed to test document" });
    }
  });

  // Test endpoint to verify a provider (for testing recently verified)
  app.post("/api/test/verify-provider/:providerId", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const providerId = parseInt(req.params.providerId);
      
      // Update provider to verified status
      const updatedProvider = await storage.updateServiceProvider(providerId, {
        verificationStatus: 'verified',
        verifiedBy: req.user.id,
        verifiedAt: new Date()
      });
      
      if (!updatedProvider) {
        return res.status(404).json({ message: "Provider not found" });
      }
      
      res.json({ 
        message: 'Provider verified successfully',
        provider: updatedProvider
      });
    } catch (error) {
      console.error('Error verifying provider:', error);
      res.status(500).json({ message: "Failed to verify provider" });
    }
  });

  // Test endpoint to list all providers and their status
  app.get("/api/test/providers-status", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const providers = await storage.getServiceProviders();
      
      const providersWithUser = await Promise.all(
        providers.map(async (provider) => {
          const user = await storage.getUser(provider.userId);
          return {
            id: provider.id,
            userId: provider.userId,
            verificationStatus: provider.verificationStatus,
            verifiedAt: provider.verifiedAt,
            verifiedBy: provider.verifiedBy,
            user: user ? {
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email
            } : null
          };
        })
      );
      
      res.json({
        totalProviders: providersWithUser.length,
        providers: providersWithUser
      });
    } catch (error) {
      console.error('Error listing providers:', error);
      res.status(500).json({ message: "Failed to list providers" });
    }
  });

  // Test endpoint to check document status
  app.get("/api/test/document-status/:documentId", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    try {
      const documentId = parseInt(req.params.documentId);
      const document = await storage.getServiceProviderDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const provider = await storage.getServiceProvider(document.providerId);
      
      res.json({
        document: {
          id: document.id,
          providerId: document.providerId,
          documentType: document.documentType,
          verificationStatus: document.verificationStatus,
          verifiedBy: document.verifiedBy,
          verifiedAt: document.verifiedAt,
          notes: document.notes,
          uploadedAt: document.uploadedAt
        },
        provider: provider ? {
          id: provider.id,
          userId: provider.userId,
          verificationStatus: provider.verificationStatus,
          verifiedBy: provider.verifiedBy,
          verifiedAt: provider.verifiedAt
        } : null
      });
    } catch (error) {
      res.status(500).json({ message: "Error checking document status", error: error.message });
    }
  });

  // Get available tasks as work orders for providers (compatibility endpoint)
  app.get("/api/work-orders/available", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      
      
      const provider = await storage.getServiceProviderByUserId(req.user!.id);
      if (!provider) {
      
        return res.status(404).json({ message: "Provider profile not found" });
      }

      // Get all tasks that are open
      const tasks = await storage.getTasks();
      
      // Filter tasks that match provider's category and are open
      const filteredTasks = tasks.filter(task => 
        task.categoryId === provider.categoryId && 
        task.status === 'open' &&
        task.clientId !== req.user!.id
      );

      // Convert tasks to work order format
      const workOrders = await Promise.all(filteredTasks.map(async (task) => {
        const client = await storage.getUser(task.clientId);
        const category = await storage.getServiceCategory(task.categoryId);
        
        return {
          id: task.id,
          title: task.title,
          description: task.description || '',
          jobType: 'task',
          budget: task.budget || null,
          isBudgetFlexible: false,
          estimatedDuration: task.estimatedDuration || null,
          experienceLevel: 'any',
          skillsRequired: '',
          status: task.status,
          createdAt: task.createdAt,
          allowBidding: true,
          category: category ? {
            id: category.id,
            name: category.name,
            description: category.description,
            icon: category.icon
          } : null,
          
          // Hide sensitive info until approval
          siteAddress: "Address will be provided after acceptance",
          clientPhoneNumber: "Contact info provided after acceptance",
          clientEmail: "Contact info provided after acceptance",
          
          // Show only city/state, not full address
          siteCity: task.location || 'Location TBD',
          siteState: 'State TBD',
          
          // Hide client personal details
          client: {
            firstName: "Client",
            lastName: "Name Hidden",
            // Don't expose personal info
          },
          
          // Calculate and show approximate distance only
          distance: null
        };
      }));
      res.json(workOrders);
    } catch (error) {
      console.error('❌ Error in available work orders endpoint:', error);
      res.status(500).json({ message: "Failed to fetch available work orders" });
    }
  });

  // Call center approval endpoint - Release full client details to provider
  app.post("/api/call-center/service-requests/:requestId/approve", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;
    
    if (!['admin', 'call_center'].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Call center staff only." });
    }

    try {
      const requestId = parseInt(req.params.requestId);
      const serviceRequest = await storage.getServiceRequest(requestId);
      
      if (!serviceRequest) {
        return res.status(404).json({ message: "Service request not found" });
      }

      if (serviceRequest.status !== 'assigned_to_call_center') {
        return res.status(400).json({ message: "Service request already processed" });
      }

      // Get task and provider details
      const task = await storage.getTask(serviceRequest.taskId);
      const provider = await storage.getServiceProvider(serviceRequest.providerId);
      const client = await storage.getUser(serviceRequest.clientId);
      
      if (!task || !provider || !client) {
        return res.status(404).json({ message: "Task, provider, or client not found" });
      }

      // Update service request status to approved
      await storage.updateServiceRequest(requestId, {
        status: 'approved',
        notes: `Approved by call center staff on ${new Date().toISOString()}`
      });

      // Notify provider with FULL client details
      const providerNotification = await storage.createNotification({
        userId: provider.userId,
        type: 'task_approved',
        title: 'Task Assignment Approved - Client Details Released',
        message: `Your task assignment for "${task.title}" has been approved. Client details: ${client.firstName} ${client.lastName}, Phone: ${client.phoneNumber || 'Not provided'}, Email: ${client.email}. Location: ${task.location || 'Location TBD'}`,
        data: JSON.stringify({ 
          taskId: task.id, 
          serviceRequestId: serviceRequest.id,
          clientId: client.id,
          clientDetails: {
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
            phoneNumber: client.phoneNumber
          }
        })
      });
      
      await sendNotificationToUser(provider.userId, providerNotification);

      // Notify client about final assignment
      const clientNotification = await storage.createNotification({
        userId: client.id,
        type: 'task_assigned',
        title: 'Task Assigned',
        message: `Your task "${task.title}" has been assigned to ${provider.user?.firstName || 'Provider'} ${provider.user?.lastName || 'Name'}. They will contact you soon to schedule the work.`,
        data: JSON.stringify({ taskId: task.id, providerId: provider.id })
      });
      
      await sendNotificationToUser(client.id, clientNotification);

      res.json({ 
        message: "Service request approved successfully. Client details released to provider.",
        serviceRequestId: requestId,
        taskId: task.id,
        providerId: provider.id
      });
    } catch (error) {
      console.error('Call center approval error:', error);
      res.status(500).json({ message: "Failed to approve service request" });
    }
  });

  // Get provider's approved service requests with full client details
  app.get("/api/provider/approved-requests", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    try {
      const provider = await storage.getServiceProviderByUserId(req.user!.id);
      if (!provider) {
        return res.status(404).json({ message: "Provider profile not found" });
      }

      // Get all service requests for this provider
      const serviceRequests = await storage.getServiceRequestsByProvider(provider.id);
      
      // Filter for approved requests and enhance with full details
      const approvedRequests = await Promise.all(
        serviceRequests
          .filter(req => req.status === 'approved')
          .map(async (request) => {
            const task = await storage.getTask(request.taskId);
            const client = await storage.getUser(request.clientId);
            
            return {
              id: request.id,
              status: request.status,
              message: request.message,
              createdAt: request.createdAt,
              approvedAt: request.updatedAt,
              task: task ? {
                id: task.id,
                title: task.title,
                description: task.description,
                location: task.location,
                budget: task.budget,
                categoryId: task.categoryId
              } : null,
              client: client ? {
                id: client.id,
                firstName: client.firstName,
                lastName: client.lastName,
                email: client.email,
                phoneNumber: client.phoneNumber
              } : null
            };
          })
      );

      res.json(approvedRequests);
    } catch (error) {
      console.error('Error fetching approved requests:', error);
      res.status(500).json({ message: "Failed to fetch approved requests" });
    }
  });

  // Get pending service requests for call center staff
  app.get("/api/call-center/pending-requests", async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    req.user = req.session.user;

    if (!['admin', 'call_center'].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Call center staff only." });
    }

    try {
      // Get all service requests with status 'assigned_to_call_center'
      const serviceRequests = await storage.getServiceRequests();
      const pendingRequests = serviceRequests.filter(req => req.status === 'assigned_to_call_center');
      
      // Enhance requests with full details
      const enhancedRequests = await Promise.all(
        pendingRequests.map(async (request) => {
          const task = await storage.getTask(request.taskId);
          const provider = await storage.getServiceProvider(request.providerId);
          const client = await storage.getUser(request.clientId);
          
          // Get provider user details and category
          const providerUser = provider ? await storage.getUser(provider.userId) : null;
          const category = provider ? await storage.getServiceCategory(provider.categoryId) : null;
          
          return {
            id: request.id,
            status: request.status,
            message: request.message,
            createdAt: request.createdAt,
            task: task ? {
              id: task.id,
              title: task.title,
              description: task.description,
              location: task.location,
              budget: task.budget,
              categoryId: task.categoryId,
              createdAt: task.createdAt
            } : null,
            provider: provider ? {
              id: provider.id,
              hourlyRate: provider.hourlyRate,
              bio: provider.bio,
              yearsOfExperience: provider.yearsOfExperience,
              category: category ? {
                id: category.id,
                name: category.name,
                description: category.description
              } : null,
              user: providerUser ? {
                id: providerUser.id,
                firstName: providerUser.firstName,
                lastName: providerUser.lastName,
                email: providerUser.email,
                phoneNumber: providerUser.phoneNumber
              } : null
            } : null,
            client: client ? {
              id: client.id,
              firstName: client.firstName,
              lastName: client.lastName,
              email: client.email,
              phoneNumber: client.phoneNumber
            } : null
          };
        })
      );

      res.json(enhancedRequests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  // Debug endpoint to list all users
  app.get("/api/debug/users", async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      return res.json({
        message: "All users in database",
        count: allUsers.length,
        users: allUsers.map(user => ({
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          hasPassword: !!user.password,
          passwordLength: user.password?.length
        }))
      });
    } catch (error) {
      console.error('Error listing users:', error);
      res.status(500).json({ message: "Error listing users" });
    }
  });

  return httpServer;
}