import { 
  users, type User, type InsertUser,
  serviceCategories, type ServiceCategory, type InsertServiceCategory,
  serviceProviders, type ServiceProvider, type InsertServiceProvider,
  tasks, type Task, type InsertTask,
  serviceRequests, type ServiceRequest, type InsertServiceRequest,
  reviews, type Review, type InsertReview,
  serviceProviderDocuments, type ServiceProviderDocument, type InsertServiceProviderDocument,
  callCenterAssignments, type CallCenterAssignment, type InsertCallCenterAssignment,
  notifications, type Notification, type InsertNotification
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, desc, and } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);

// Define the storage interface
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getStaffUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<boolean>;
  
  // Service Category methods
  getServiceCategories(): Promise<ServiceCategory[]>;
  getServiceCategory(id: number): Promise<ServiceCategory | undefined>;
  createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory>;
  
  // Service Provider methods
  createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider>;
  getServiceProvider(id: number): Promise<ServiceProvider | undefined>;
  getServiceProviderByUserId(userId: number): Promise<ServiceProvider | undefined>;
  getServiceProviders(): Promise<ServiceProvider[]>;
  getServiceProvidersByCategory(categoryId: number): Promise<ServiceProvider[]>;
  getServiceProviderWithUser(id: number): Promise<any | undefined>;
  updateServiceProvider(id: number, provider: Partial<ServiceProvider>): Promise<ServiceProvider | undefined>;
  
  // Task methods
  createTask(task: InsertTask): Promise<Task>;
  getTask(id: number): Promise<Task | undefined>;
  getTasks(): Promise<Task[]>;
  getTasksByClient(clientId: number): Promise<Task[]>;
  getTasksByCategory(categoryId: number): Promise<Task[]>;
  updateTask(id: number, task: Partial<Task>): Promise<Task | undefined>;
  
  // Service Request methods
  createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest>;
  getServiceRequest(id: number): Promise<ServiceRequest | undefined>;
  getServiceRequestsByProvider(providerId: number): Promise<ServiceRequest[]>;
  getServiceRequestsByClient(clientId: number): Promise<ServiceRequest[]>;
  updateServiceRequest(id: number, request: Partial<ServiceRequest>): Promise<ServiceRequest | undefined>;
  
  // Review methods
  createReview(review: InsertReview): Promise<Review>;
  getReviewsByProvider(providerId: number): Promise<Review[]>;
  
  // Service Provider Document methods
  createServiceProviderDocument(document: InsertServiceProviderDocument): Promise<ServiceProviderDocument>;
  getServiceProviderDocuments(providerId: number): Promise<ServiceProviderDocument[]>;
  updateServiceProviderDocument(id: number, document: Partial<ServiceProviderDocument>): Promise<ServiceProviderDocument | undefined>;
  
  // Call Center Assignment methods
  createCallCenterAssignment(assignment: InsertCallCenterAssignment): Promise<CallCenterAssignment>;
  getCallCenterAssignments(callCenterUserId: number): Promise<CallCenterAssignment[]>;
  updateCallCenterAssignment(id: number, assignment: Partial<CallCenterAssignment>): Promise<CallCenterAssignment | undefined>;
  
  // Notification methods
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<boolean>;
  markAllNotificationsAsRead(userId: number): Promise<boolean>;
  
  // Location-based methods
  getNearbyServiceProviders(latitude: number, longitude: number, radius: number, categoryId?: number): Promise<ServiceProvider[]>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private serviceCategories: Map<number, ServiceCategory>;
  private serviceProviders: Map<number, ServiceProvider>;
  private tasks: Map<number, Task>;
  private serviceRequests: Map<number, ServiceRequest>;
  private reviews: Map<number, Review>;
  private serviceProviderDocuments: Map<number, ServiceProviderDocument>;
  private callCenterAssignments: Map<number, CallCenterAssignment>;
  private notifications: Map<number, Notification>;
  
  sessionStore: session.Store;
  currentId: { [key: string]: number };

  constructor() {
    this.users = new Map();
    this.serviceCategories = new Map();
    this.serviceProviders = new Map();
    this.tasks = new Map();
    this.serviceRequests = new Map();
    this.reviews = new Map();
    this.serviceProviderDocuments = new Map();
    this.callCenterAssignments = new Map();
    
    this.currentId = {
      users: 1,
      serviceCategories: 1,
      serviceProviders: 1,
      tasks: 1,
      serviceRequests: 1,
      reviews: 1,
      serviceProviderDocuments: 1,
      callCenterAssignments: 1
    };
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Initialize with some service categories
    this.initializeServiceCategories();
  }

  // Initialize service categories
  private async initializeServiceCategories() {
    const categories = [
      { name: "Home Cleaning", description: "House cleaning services", icon: "broom" },
      { name: "Handyman", description: "General home repairs and maintenance", icon: "tools" },
      { name: "Moving Help", description: "Help with moving and lifting items", icon: "truck" },
      { name: "Tech Support", description: "Technical support for computers and devices", icon: "laptop-code" },
      { name: "Painting", description: "Interior and exterior painting services", icon: "paint-roller" },
      { name: "Lawn Care", description: "Lawn mowing and garden maintenance", icon: "leaf" }
    ];
    
    for (const category of categories) {
      await this.createServiceCategory(category);
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId.users++;
    const createdAt = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt, 
      updatedAt: createdAt,
      role: insertUser.role || "client",
      profilePicture: insertUser.profilePicture || null,
      phoneNumber: insertUser.phoneNumber || null,
      isActive: insertUser.isActive ?? true
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Service Category methods
  async getServiceCategories(): Promise<ServiceCategory[]> {
    return Array.from(this.serviceCategories.values());
  }
  
  async getServiceCategory(id: number): Promise<ServiceCategory | undefined> {
    return this.serviceCategories.get(id);
  }
  
  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const id = this.currentId.serviceCategories++;
    const newCategory: ServiceCategory = { 
      ...category, 
      id,
      description: category.description || null,
      icon: category.icon || null
    };
    this.serviceCategories.set(id, newCategory);
    return newCategory;
  }

  // Service Provider methods
  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const id = this.currentId.serviceProviders++;
    const createdAt = new Date();
    const newProvider: ServiceProvider = { 
      ...provider, 
      id, 
      rating: 0, 
      completedJobs: 0,
      bio: provider.bio || null,
      yearsOfExperience: provider.yearsOfExperience || null,
      availability: provider.availability || null,
      createdAt,
      updatedAt: createdAt,
      verificationStatus: provider.verificationStatus || "pending",
      verifiedAt: null,
      verifiedBy: null,
      rejectionReason: null
    };
    this.serviceProviders.set(id, newProvider);
    return newProvider;
  }
  
  async getServiceProvider(id: number): Promise<ServiceProvider | undefined> {
    return this.serviceProviders.get(id);
  }
  
  async getServiceProviderByUserId(userId: number): Promise<ServiceProvider | undefined> {
    return Array.from(this.serviceProviders.values()).find(
      (provider) => provider.userId === userId
    );
  }
  
  async getServiceProviders(): Promise<ServiceProvider[]> {
    return Array.from(this.serviceProviders.values());
  }
  
  async getServiceProvidersByCategory(categoryId: number): Promise<ServiceProvider[]> {
    return Array.from(this.serviceProviders.values()).filter(
      (provider) => provider.categoryId === categoryId
    );
  }
  
  async getServiceProviderWithUser(id: number): Promise<any | undefined> {
    const provider = await this.getServiceProvider(id);
    if (!provider) return undefined;
    
    const user = await this.getUser(provider.userId);
    const category = await this.getServiceCategory(provider.categoryId);
    
    if (!user || !category) return undefined;
    
    return {
      ...provider,
      user,
      category
    };
  }
  
  async updateServiceProvider(id: number, providerData: Partial<ServiceProvider>): Promise<ServiceProvider | undefined> {
    const provider = await this.getServiceProvider(id);
    if (!provider) return undefined;
    
    const updatedProvider = { ...provider, ...providerData };
    this.serviceProviders.set(id, updatedProvider);
    return updatedProvider;
  }

  // Task methods
  async createTask(task: InsertTask): Promise<Task> {
    const id = this.currentId.tasks++;
    const createdAt = new Date();
    const newTask: Task = { 
      ...task, 
      id, 
      createdAt, 
      completedAt: null,
      status: task.status || "open", // ensure status is always defined
      budget: task.budget !== undefined ? task.budget : null
    };
    this.tasks.set(id, newTask);
    return newTask;
  }
  
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async getTasks(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }
  
  async getTasksByClient(clientId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.clientId === clientId
    );
  }
  
  async getTasksByCategory(categoryId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.categoryId === categoryId
    );
  }
  
  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    const task = await this.getTask(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...taskData };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  // Service Request methods
  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    const id = this.currentId.serviceRequests++;
    const createdAt = new Date();
    const newRequest: ServiceRequest = { 
      ...request, 
      id, 
      createdAt,
      updatedAt: createdAt,
      status: request.status || "pending",
      budget: request.budget || null,
      providerId: request.providerId || null,
      message: request.message || null,
      assignedToCallCenter: request.assignedToCallCenter || null,
      scheduledDate: request.scheduledDate || null,
      callNotes: request.callNotes || null,
      taskId: request.taskId || null,
      assignedAt: null,
      contactedAt: null
    };
    this.serviceRequests.set(id, newRequest);
    return newRequest;
  }
  
  async getServiceRequest(id: number): Promise<ServiceRequest | undefined> {
    return this.serviceRequests.get(id);
  }
  
  async getServiceRequestsByProvider(providerId: number): Promise<ServiceRequest[]> {
    return Array.from(this.serviceRequests.values()).filter(
      (request) => request.providerId === providerId
    );
  }
  
  async getServiceRequestsByClient(clientId: number): Promise<ServiceRequest[]> {
    return Array.from(this.serviceRequests.values()).filter(
      (request) => request.clientId === clientId
    );
  }
  
  async updateServiceRequest(id: number, requestData: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    const request = await this.getServiceRequest(id);
    if (!request) return undefined;
    
    const updatedRequest = { ...request, ...requestData };
    this.serviceRequests.set(id, updatedRequest);
    return updatedRequest;
  }

  // Review methods
  async createReview(review: InsertReview): Promise<Review> {
    const id = this.currentId.reviews++;
    const createdAt = new Date();
    const newReview: Review = { 
      ...review, 
      id, 
      createdAt,
      comment: review.comment !== undefined ? review.comment : null
    };
    this.reviews.set(id, newReview);
    
    // Update service provider rating
    const providerReviews = await this.getReviewsByProvider(review.providerId);
    const provider = await this.getServiceProvider(review.providerId);
    
    if (provider) {
      const totalRating = providerReviews.reduce((sum, review) => sum + review.rating, 0) + review.rating;
      const newRating = totalRating / (providerReviews.length + 1);
      
      await this.updateServiceProvider(review.providerId, {
        rating: parseFloat(newRating.toFixed(1))
      });
    }
    
    return newReview;
  }
  
  async getReviewsByProvider(providerId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(
      (review) => review.providerId === providerId
    );
  }

  // Service Provider Document methods
  async createServiceProviderDocument(document: InsertServiceProviderDocument): Promise<ServiceProviderDocument> {
    const id = this.currentId.serviceProviderDocuments++;
    const newDocument: ServiceProviderDocument = { 
      id, 
      ...document,
      verificationStatus: document.verificationStatus || "pending",
      uploadedAt: new Date(),
      verifiedAt: null,
      verifiedBy: null,
      notes: document.notes || null
    };
    this.serviceProviderDocuments.set(id, newDocument);
    return newDocument;
  }

  async getServiceProviderDocuments(providerId: number): Promise<ServiceProviderDocument[]> {
    return Array.from(this.serviceProviderDocuments.values()).filter(
      (document) => document.providerId === providerId
    );
  }

  async updateServiceProviderDocument(id: number, documentData: Partial<ServiceProviderDocument>): Promise<ServiceProviderDocument | undefined> {
    const document = this.serviceProviderDocuments.get(id);
    if (document) {
      const updatedDocument = { ...document, ...documentData, updatedAt: new Date() };
      this.serviceProviderDocuments.set(id, updatedDocument);
      return updatedDocument;
    }
    return undefined;
  }

  // Call Center Assignment methods
  async createCallCenterAssignment(assignment: InsertCallCenterAssignment): Promise<CallCenterAssignment> {
    const id = this.currentId.callCenterAssignments++;
    const newAssignment: CallCenterAssignment = { 
      id, 
      ...assignment,
      status: assignment.status || "assigned",
      assignedAt: new Date(),
      completedAt: null,
      attempts: assignment.attempts || 0,
      lastAttemptAt: null,
      notes: assignment.notes || null
    };
    this.callCenterAssignments.set(id, newAssignment);
    return newAssignment;
  }

  async getCallCenterAssignments(callCenterUserId: number): Promise<CallCenterAssignment[]> {
    return Array.from(this.callCenterAssignments.values()).filter(
      (assignment) => assignment.callCenterUserId === callCenterUserId
    );
  }

  async updateCallCenterAssignment(id: number, assignmentData: Partial<CallCenterAssignment>): Promise<CallCenterAssignment | undefined> {
    const assignment = this.callCenterAssignments.get(id);
    if (assignment) {
      const updatedAssignment = { ...assignment, ...assignmentData, updatedAt: new Date() };
      this.callCenterAssignments.set(id, updatedAssignment);
      return updatedAssignment;
    }
    return undefined;
  }

  // Staff management methods
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getStaffUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.role === "service_verifier" || user.role === "call_center"
    );
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Set up PostgreSQL session store
    const PostgresSessionStore = connectPg(session);
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true
    });
    
    // Initialize sample service categories and admin user
    this.initializeServiceCategories();
    this.initializeAdminUser();
  }
  
  private async initializeServiceCategories() {
    // Add some default service categories if none exist
    const categories = await db.select().from(serviceCategories);
    
    if (categories.length === 0) {
      await Promise.all([
        db.insert(serviceCategories).values({ 
          name: "Home Cleaning", 
          description: "House cleaning, carpet cleaning, and other home cleaning services",
          icon: "Trash2"
        }),
        
        db.insert(serviceCategories).values({ 
          name: "Handyman", 
          description: "General home repairs, furniture assembly, and other handyman services",
          icon: "Hammer"
        }),
        
        db.insert(serviceCategories).values({ 
          name: "Lawn Care", 
          description: "Lawn mowing, gardening, landscaping, and other yard work",
          icon: "Scissors"
        }),
        
        db.insert(serviceCategories).values({ 
          name: "Tutoring", 
          description: "Academic tutoring, test preparation, and other educational services",
          icon: "BookOpen"
        }),
        
        db.insert(serviceCategories).values({ 
          name: "Pet Care", 
          description: "Pet sitting, dog walking, grooming, and other pet services",
          icon: "PawPrint"
        })
      ]);
    }
  }

  private async initializeAdminUser() {
    // Create admin user if it doesn't exist
    const adminEmail = "findmyhelper2025@gmail.com";
    const existingAdmin = await this.getUserByEmail(adminEmail);
    
    if (!existingAdmin) {
      // Import password hashing function
      const { scrypt, randomBytes } = await import("crypto");
      const { promisify } = await import("util");
      const scryptAsync = promisify(scrypt);
      
      const password = "Fmh@2025";
      const salt = randomBytes(16).toString("hex");
      const buf = (await scryptAsync(password, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString("hex")}.${salt}`;
      
      await db.insert(users).values({
        email: adminEmail,
        username: "admin",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        role: "admin"
      });
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return user;
  }

  async getServiceCategories(): Promise<ServiceCategory[]> {
    return db.select().from(serviceCategories);
  }

  async getServiceCategory(id: number): Promise<ServiceCategory | undefined> {
    const [category] = await db.select().from(serviceCategories).where(eq(serviceCategories.id, id));
    return category;
  }

  async createServiceCategory(category: InsertServiceCategory): Promise<ServiceCategory> {
    const [newCategory] = await db.insert(serviceCategories).values(category).returning();
    return newCategory;
  }

  async createServiceProvider(provider: InsertServiceProvider): Promise<ServiceProvider> {
    const [newProvider] = await db.insert(serviceProviders).values({
      ...provider,
      rating: 0,
      completedJobs: 0
    }).returning();
    
    return newProvider;
  }

  async getServiceProvider(id: number): Promise<ServiceProvider | undefined> {
    const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.id, id));
    return provider;
  }

  async getServiceProviderByUserId(userId: number): Promise<ServiceProvider | undefined> {
    try {
      console.log('DatabaseStorage: Querying provider for userId:', userId);
      const [provider] = await db.select().from(serviceProviders).where(eq(serviceProviders.userId, userId));
      console.log('DatabaseStorage: Provider result:', provider);
      return provider;
    } catch (error) {
      console.error('DatabaseStorage: Error querying provider:', error);
      throw error;
    }
  }

  async getServiceProviders(): Promise<ServiceProvider[]> {
    return db.select().from(serviceProviders);
  }

  async getServiceProvidersByCategory(categoryId: number): Promise<ServiceProvider[]> {
    return db.select().from(serviceProviders).where(eq(serviceProviders.categoryId, categoryId));
  }

  async getServiceProviderWithUser(id: number): Promise<any | undefined> {
    const provider = await this.getServiceProvider(id);
    
    if (!provider) {
      return undefined;
    }
    
    const user = await this.getUser(provider.userId);
    const category = await this.getServiceCategory(provider.categoryId);
    
    if (!user || !category) {
      return undefined;
    }
    
    return {
      ...provider,
      user,
      category
    };
  }

  async updateServiceProvider(id: number, providerData: Partial<ServiceProvider>): Promise<ServiceProvider | undefined> {
    const [provider] = await db.update(serviceProviders)
      .set(providerData)
      .where(eq(serviceProviders.id, id))
      .returning();
    
    return provider;
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks);
  }

  async getTasksByClient(clientId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.clientId, clientId));
  }

  async getTasksByCategory(categoryId: number): Promise<Task[]> {
    return db.select().from(tasks).where(eq(tasks.categoryId, categoryId));
  }

  async updateTask(id: number, taskData: Partial<Task>): Promise<Task | undefined> {
    const [task] = await db.update(tasks)
      .set(taskData)
      .where(eq(tasks.id, id))
      .returning();
    
    return task;
  }

  async createServiceRequest(request: InsertServiceRequest): Promise<ServiceRequest> {
    const [newRequest] = await db.insert(serviceRequests).values(request).returning();
    return newRequest;
  }

  async getServiceRequest(id: number): Promise<ServiceRequest | undefined> {
    const [request] = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id));
    return request;
  }

  async getServiceRequestsByProvider(providerId: number): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests).where(eq(serviceRequests.providerId, providerId));
  }

  async getServiceRequestsByClient(clientId: number): Promise<ServiceRequest[]> {
    return db.select().from(serviceRequests).where(eq(serviceRequests.clientId, clientId));
  }

  async updateServiceRequest(id: number, requestData: Partial<ServiceRequest>): Promise<ServiceRequest | undefined> {
    const [request] = await db.update(serviceRequests)
      .set(requestData)
      .where(eq(serviceRequests.id, id))
      .returning();
    
    return request;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [newReview] = await db.insert(reviews).values(review).returning();
    
    // Update service provider rating
    const providerReviews = await this.getReviewsByProvider(review.providerId);
    const provider = await this.getServiceProvider(review.providerId);
    
    if (provider) {
      const totalRating = providerReviews.reduce((sum, review) => sum + review.rating, 0) + review.rating;
      const newRating = totalRating / (providerReviews.length + 1);
      
      await this.updateServiceProvider(review.providerId, {
        rating: parseFloat(newRating.toFixed(1))
      });
    }
    
    return newReview;
  }

  async getReviewsByProvider(providerId: number): Promise<Review[]> {
    return db.select().from(reviews).where(eq(reviews.providerId, providerId));
  }

  // Service Provider Document methods
  async createServiceProviderDocument(document: InsertServiceProviderDocument): Promise<ServiceProviderDocument> {
    const [newDocument] = await db.insert(serviceProviderDocuments).values(document).returning();
    return newDocument;
  }

  async getServiceProviderDocuments(providerId: number): Promise<ServiceProviderDocument[]> {
    return db.select().from(serviceProviderDocuments).where(eq(serviceProviderDocuments.providerId, providerId));
  }

  async updateServiceProviderDocument(id: number, documentData: Partial<ServiceProviderDocument>): Promise<ServiceProviderDocument | undefined> {
    const [document] = await db.update(serviceProviderDocuments)
      .set(documentData)
      .where(eq(serviceProviderDocuments.id, id))
      .returning();
    
    return document;
  }

  // Call Center Assignment methods
  async createCallCenterAssignment(assignment: InsertCallCenterAssignment): Promise<CallCenterAssignment> {
    const [newAssignment] = await db.insert(callCenterAssignments).values(assignment).returning();
    return newAssignment;
  }

  async getCallCenterAssignments(callCenterUserId: number): Promise<CallCenterAssignment[]> {
    return db.select().from(callCenterAssignments).where(eq(callCenterAssignments.callCenterUserId, callCenterUserId));
  }

  async updateCallCenterAssignment(id: number, assignmentData: Partial<CallCenterAssignment>): Promise<CallCenterAssignment | undefined> {
    const [assignment] = await db.update(callCenterAssignments)
      .set(assignmentData)
      .where(eq(callCenterAssignments.id, id))
      .returning();
    
    return assignment;
  }

  // Staff management methods
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getStaffUsers(): Promise<User[]> {
    return db.select().from(users).where(
      eq(users.role, "service_verifier")
    ).union(
      db.select().from(users).where(eq(users.role, "call_center"))
    );
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Notification methods
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(notifications).where(
      and(eq(notifications.userId, userId), eq(notifications.isRead, false))
    ).orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    const result = await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
    return (result.rowCount ?? 0) > 0;
  }

  // Location-based methods
  async getNearbyServiceProviders(latitude: number, longitude: number, radius: number, categoryId?: number): Promise<ServiceProvider[]> {
    // Using the Haversine formula for distance calculation
    // Only include providers who have at least 2 approved documents (Government ID + Professional License)
    const query = `
      SELECT sp.*, u.latitude, u.longitude 
      FROM service_providers sp 
      JOIN users u ON sp.user_id = u.id 
      WHERE u.latitude IS NOT NULL 
        AND u.longitude IS NOT NULL 
        AND (6371 * acos(cos(radians($1)) * cos(radians(u.latitude)) * cos(radians(u.longitude) - radians($2)) + sin(radians($1)) * sin(radians(u.latitude)))) <= $3
        AND (
          SELECT COUNT(*) 
          FROM service_provider_documents spd 
          WHERE spd.provider_id = sp.id 
            AND spd.verification_status = 'approved'
        ) >= 2
        ${categoryId ? 'AND sp.category_id = $4' : ''}
    `;
    
    const params = categoryId ? [latitude, longitude, radius, categoryId] : [latitude, longitude, radius];
    const result = await pool.query(query, params);
    return result.rows;
  }
}

export const storage = new DatabaseStorage();
