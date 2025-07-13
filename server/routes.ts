import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { pool, db } from "./db";
import { z } from "zod";
import { serviceProviders } from "@shared/schema";
import { eq } from "drizzle-orm";
import { 
  insertTaskSchema, 
  insertServiceRequestSchema,
  insertReviewSchema,
  insertUserSchema,
  insertUserWithBankSchema,
  insertPaymentApproverSchema,
  insertNotificationSchema,
  insertEscrowPaymentSchema,
  insertWorkCompletionPhotoSchema,
  insertProviderBankAccountSchema,
  paymentStatuses,
  userRoles
} from "@shared/schema";
import Stripe from "stripe";
import type { Request, Response, NextFunction } from "express";

// Distance calculation utility for privacy protection
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in kilometers
}

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
});

// Payment calculations
const PLATFORM_FEE_PERCENTAGE = 0.15; // 15% platform fee
const TAX_RATE = 0.08; // 8% tax rate

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

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
    console.log('=== /api/providers/me route hit ===');
    console.log('req.isAuthenticated():', req.isAuthenticated());
    console.log('req.user:', req.user);
    
    if (!req.isAuthenticated()) {
      console.log('Authentication failed');
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      console.log('Fetching provider for user ID:', req.user.id);
      const result = await pool.query('SELECT * FROM service_providers WHERE user_id = $1', [req.user.id]);
      console.log('Raw SQL result rows count:', result.rows.length);
      console.log('Raw SQL result:', result.rows);
      
      if (result.rows.length === 0) {
        console.log('No provider found for user ID:', req.user.id);
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
      
      console.log('Sending provider data:', provider);
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const { categoryId, hourlyRate, bio, experience } = req.body;
      
      // Validate required fields
      if (!categoryId || !hourlyRate || !bio) {
        return res.status(400).json({ message: "Category, hourly rate, and bio are required" });
      }
      
      const serviceProvider = await storage.getServiceProviderByUserId(req.user.id);
      if (!serviceProvider) {
        return res.status(404).json({ message: "Service provider profile not found" });
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to view your tasks" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to update a task" });
    }
    
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

  // Service Requests routes (creation handled later with enhanced call center workflow)
  
  app.get("/api/service-requests/client", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to view your requests" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to view requests" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to update a request" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to create a review" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

    try {
      const { profilePicture } = req.body;
      console.log('Profile picture update request for user:', req.user.id);
      console.log('Profile picture data length:', profilePicture ? profilePicture.length : 0);
      
      const updatedUser = await storage.updateUser(req.user.id, {
        profilePicture: profilePicture || null
      });
      
      if (!updatedUser) {
        console.log('User not found during profile picture update:', req.user.id);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log('Profile picture updated successfully for user:', req.user.id);
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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
        verificationStatus: "pending"
      });
      
      res.status(201).json(document);
    } catch (err) {
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // Get provider documents (for current user)
  app.get("/api/user/provider/documents", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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

  // Admin middleware
  const requireAdmin = (req: any, res: Response, next: NextFunction) => {
    if (!req.user || req.user.email !== 'findmyhelper2025@gmail.com') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  };

  // Admin routes
  app.get('/api/admin/staff', async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
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

      // Set createdBy to admin user ID
      const userWithCreator = {
        ...validatedData,
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to view notifications" });
    }
    
    try {
      const notifications = await storage.getNotifications(req.user.id);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to view notifications" });
    }
    
    try {
      const notifications = await storage.getUnreadNotifications(req.user.id);
      res.json(notifications);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    res.json({ 
      debug: true, 
      userId: req.user?.id,
      userRole: req.user?.role,
      userExists: !!req.user
    });
  });

  // Get current user's service provider profile
  app.get("/api/providers/me", async (req, res) => {
    console.log('=== /api/providers/me route hit ===');
    console.log('req.isAuthenticated():', req.isAuthenticated());
    console.log('req.user:', req.user);
    
    if (!req.isAuthenticated()) {
      console.log('Authentication failed');
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      console.log('Fetching provider for user ID:', req.user.id);
      const result = await pool.query('SELECT * FROM service_providers WHERE user_id = $1', [req.user.id]);
      console.log('Raw SQL result rows count:', result.rows.length);
      console.log('Raw SQL result:', result.rows);
      
      if (result.rows.length === 0) {
        console.log('No provider found for user ID:', req.user.id);
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
      
      console.log('Sending provider data:', provider);
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const { categoryId, hourlyRate, bio, experience } = req.body;
      
      // Validate required fields
      if (!categoryId || !hourlyRate || !bio) {
        return res.status(400).json({ message: "Category, hourly rate, and bio are required" });
      }
      
      const serviceProvider = await storage.getServiceProviderByUserId(req.user.id);
      if (!serviceProvider) {
        return res.status(404).json({ message: "Service provider profile not found" });
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to create a task" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in to create a service request" });
    }
    
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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    if (req.user.role !== userRoles.PAYMENT_APPROVER && req.user.role !== userRoles.ADMIN) {
      return res.status(403).json({ message: "Payment approver access required" });
    }
    next();
  };

  // Create payment intent for service request
  app.post("/api/payments/create-intent", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }

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

  return httpServer;
}
