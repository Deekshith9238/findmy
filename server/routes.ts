import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { z } from "zod";
import { 
  insertTaskSchema, 
  insertServiceRequestSchema,
  insertReviewSchema,
  insertUserSchema,
  insertNotificationSchema
} from "@shared/schema";
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
      
      const updatedUser = await storage.updateUser(req.user.id, {
        profilePicture: profilePicture || null
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (err) {
      res.status(500).json({ message: "Failed to update profile picture" });
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
      const validatedData = insertUserSchema.parse(req.body);
      
      // Check if username or email already exists
      const existingUser = await storage.getUserByUsername(validatedData.username) || 
                          await storage.getUserByEmail(validatedData.email);
      
      if (existingUser) {
        return res.status(400).json({ message: 'Username or email already exists' });
      }

      // Only allow creating service_verifier and call_center roles
      if (!['service_verifier', 'call_center'].includes(validatedData.role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
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

      // Only allow deleting service_verifier and call_center roles
      if (!['service_verifier', 'call_center'].includes(user.role)) {
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

  // Get current user's service provider profile
  app.get("/api/providers/me", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "You must be logged in" });
    }
    
    try {
      const serviceProvider = await storage.getServiceProviderByUserId(req.user.id);
      if (!serviceProvider) {
        return res.status(404).json({ message: "Service provider profile not found" });
      }
      res.json(serviceProvider);
    } catch (error) {
      console.error('Error fetching service provider profile:', error);
      res.status(500).json({ message: "Failed to fetch service provider profile" });
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
      // Only send task name and approximate distance, NOT exact address
      const notifications = await Promise.all(
        nearbyProviders.map(async (provider: any) => {
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
      );
      
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

  return httpServer;
}
