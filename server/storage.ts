import { 
  users, type User, type InsertUser,
  serviceCategories, type ServiceCategory, type InsertServiceCategory,
  serviceProviders, type ServiceProvider, type InsertServiceProvider,
  tasks, type Task, type InsertTask,
  serviceRequests, type ServiceRequest, type InsertServiceRequest,
  reviews, type Review, type InsertReview,
  serviceProviderDocuments, type ServiceProviderDocument, type InsertServiceProviderDocument,
  callCenterAssignments, type CallCenterAssignment, type InsertCallCenterAssignment,
  notifications, type Notification, type InsertNotification,
  escrowPayments, type EscrowPayment, type InsertEscrowPayment,
  workCompletionPhotos, type WorkCompletionPhoto, type InsertWorkCompletionPhoto,
  providerBankAccounts, type ProviderBankAccount, type InsertProviderBankAccount,
  // FieldNation-style entities
  workOrders, type WorkOrder, type InsertWorkOrder,
  jobBids, type JobBid, type InsertJobBid,
  providerSkills, type ProviderSkill, type InsertProviderSkill,
  providerEquipment, type ProviderEquipment, type InsertProviderEquipment,
  otpVerifications, type OtpVerification, type InsertOtpVerification
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
  
  // Payment system methods
  createEscrowPayment(payment: InsertEscrowPayment): Promise<EscrowPayment>;
  getEscrowPayment(id: number): Promise<EscrowPayment | undefined>;
  getEscrowPaymentByServiceRequest(serviceRequestId: number): Promise<EscrowPayment | undefined>;
  updateEscrowPayment(id: number, payment: Partial<EscrowPayment>): Promise<EscrowPayment | undefined>;
  getPendingPayments(): Promise<EscrowPayment[]>;
  
  // Work completion photos
  createWorkCompletionPhoto(photo: InsertWorkCompletionPhoto): Promise<WorkCompletionPhoto>;
  getWorkCompletionPhotos(serviceRequestId: number): Promise<WorkCompletionPhoto[]>;
  
  // Provider bank accounts
  createProviderBankAccount(account: InsertProviderBankAccount): Promise<ProviderBankAccount>;
  getProviderBankAccount(providerId: number): Promise<ProviderBankAccount | undefined>;
  updateProviderBankAccount(id: number, account: Partial<ProviderBankAccount>): Promise<ProviderBankAccount | undefined>;
  
  // FieldNation-style Work Order methods
  createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder>;
  getWorkOrder(id: number): Promise<WorkOrder | undefined>;
  getWorkOrderWithDetails(id: number): Promise<any | undefined>;
  getWorkOrdersByClient(clientId: number): Promise<WorkOrder[]>;
  getWorkOrdersByProvider(providerId: number): Promise<WorkOrder[]>;
  getAvailableWorkOrders(categoryId?: number): Promise<WorkOrder[]>;
  getAvailableWorkOrdersByLocation(lat: number, lng: number, radius: number, categoryId?: number): Promise<WorkOrder[]>;
  updateWorkOrder(id: number, workOrder: Partial<WorkOrder>): Promise<WorkOrder | undefined>;
  
  // Job Bidding methods
  createJobBid(bid: InsertJobBid): Promise<JobBid>;
  getJobBid(id: number): Promise<JobBid | undefined>;
  getJobBidsByWorkOrder(workOrderId: number): Promise<any[]>;
  getJobBidsByProvider(providerId: number): Promise<JobBid[]>;
  updateJobBid(id: number, bid: Partial<JobBid>): Promise<JobBid | undefined>;
  
  // Provider Skills methods
  createProviderSkill(skill: InsertProviderSkill): Promise<ProviderSkill>;
  getProviderSkills(providerId: number): Promise<ProviderSkill[]>;
  deleteProviderSkill(id: number): Promise<boolean>;
  
  // Provider Equipment methods
  createProviderEquipment(equipment: InsertProviderEquipment): Promise<ProviderEquipment>;
  getProviderEquipment(providerId: number): Promise<ProviderEquipment[]>;
  deleteProviderEquipment(id: number): Promise<boolean>;
  
  // Enhanced location methods for FieldNation
  getServiceProvidersByLocation(lat: number, lng: number, radius: number, categoryId?: number): Promise<any[]>;
  
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
  private escrowPayments: Map<number, EscrowPayment>;
  private workCompletionPhotos: Map<number, WorkCompletionPhoto>;
  private providerBankAccounts: Map<number, ProviderBankAccount>;
  // FieldNation-style maps
  private workOrders: Map<number, WorkOrder>;
  private jobBids: Map<number, JobBid>;
  private providerSkills: Map<number, ProviderSkill>;
  private providerEquipment: Map<number, ProviderEquipment>;
  
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
    this.notifications = new Map();
    this.escrowPayments = new Map();
    this.workCompletionPhotos = new Map();
    this.providerBankAccounts = new Map();
    // FieldNation-style maps
    this.workOrders = new Map();
    this.jobBids = new Map();
    this.providerSkills = new Map();
    this.providerEquipment = new Map();
    
    this.currentId = {
      users: 1,
      serviceCategories: 1,
      serviceProviders: 1,
      tasks: 1,
      serviceRequests: 1,
      reviews: 1,
      serviceProviderDocuments: 1,
      callCenterAssignments: 1,
      notifications: 1,
      escrowPayments: 1,
      workCompletionPhotos: 1,
      providerBankAccounts: 1,
      // FieldNation IDs
      workOrders: 1,
      jobBids: 1,
      providerSkills: 1,
      providerEquipment: 1
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
      status: task.status || "open",
      budget: task.budget || null,
      latitude: task.latitude || null,
      longitude: task.longitude || null,
      location: task.location || null,
      scheduledDate: task.scheduledDate || null,
      scheduledTime: task.scheduledTime || null
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

  // OTP verification methods
  async createOtpVerification(data: InsertOtpVerification): Promise<OtpVerification> {
    const [otp] = await db.insert(otpVerifications).values(data).returning();
    return otp;
  }

  async getOtpVerification(email: string, otpCode: string, purpose: string): Promise<OtpVerification | undefined> {
    const [otp] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.email, email),
          eq(otpVerifications.otpCode, otpCode),
          eq(otpVerifications.purpose, purpose)
        )
      )
      .orderBy(desc(otpVerifications.createdAt));
    return otp;
  }

  async updateOtpVerification(id: number, updates: Partial<InsertOtpVerification>): Promise<void> {
    await db.update(otpVerifications).set(updates).where(eq(otpVerifications.id, id));
  }

  async updateUserEmailVerification(userId: number, isVerified: boolean): Promise<void> {
    await db.update(users).set({ isEmailVerified: isVerified }).where(eq(users.id, userId));
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
    try {
      console.log('DatabaseStorage: Creating task with data:', task);
      const [newTask] = await db.insert(tasks).values(task).returning();
      console.log('DatabaseStorage: Task created successfully:', newTask);
      return newTask;
    } catch (error) {
      console.error('DatabaseStorage: Error creating task:', error);
      throw error;
    }
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task;
  }

  async getTasks(): Promise<Task[]> {
    return db.select().from(tasks);
  }

  async getTasksByClient(clientId: number): Promise<Task[]> {
    try {
      console.log('DatabaseStorage: Getting tasks for client:', clientId);
      const clientTasks = await db.select().from(tasks).where(eq(tasks.clientId, clientId));
      console.log('DatabaseStorage: Found tasks:', clientTasks.length);
      return clientTasks;
    } catch (error) {
      console.error('DatabaseStorage: Error getting tasks for client:', error);
      throw error;
    }
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

  // Payment system methods
  async createEscrowPayment(payment: InsertEscrowPayment): Promise<EscrowPayment> {
    const [newPayment] = await db.insert(escrowPayments).values(payment).returning();
    return newPayment;
  }

  async getEscrowPayment(id: number): Promise<EscrowPayment | undefined> {
    const [payment] = await db.select().from(escrowPayments).where(eq(escrowPayments.id, id));
    return payment;
  }

  async getEscrowPaymentByServiceRequest(serviceRequestId: number): Promise<EscrowPayment | undefined> {
    const [payment] = await db.select().from(escrowPayments).where(eq(escrowPayments.serviceRequestId, serviceRequestId));
    return payment;
  }

  async updateEscrowPayment(id: number, payment: Partial<EscrowPayment>): Promise<EscrowPayment | undefined> {
    const [updatedPayment] = await db.update(escrowPayments)
      .set(payment)
      .where(eq(escrowPayments.id, id))
      .returning();
    return updatedPayment;
  }

  async getPendingPayments(): Promise<EscrowPayment[]> {
    return db.select().from(escrowPayments).where(eq(escrowPayments.status, 'held'));
  }

  // Work completion photos
  async createWorkCompletionPhoto(photo: InsertWorkCompletionPhoto): Promise<WorkCompletionPhoto> {
    const [newPhoto] = await db.insert(workCompletionPhotos).values(photo).returning();
    return newPhoto;
  }

  async getWorkCompletionPhotos(serviceRequestId: number): Promise<WorkCompletionPhoto[]> {
    return db.select().from(workCompletionPhotos).where(eq(workCompletionPhotos.serviceRequestId, serviceRequestId));
  }

  // Provider bank accounts
  async createProviderBankAccount(account: InsertProviderBankAccount): Promise<ProviderBankAccount> {
    const [newAccount] = await db.insert(providerBankAccounts).values(account).returning();
    return newAccount;
  }

  async getProviderBankAccount(providerId: number): Promise<ProviderBankAccount | undefined> {
    const [account] = await db.select().from(providerBankAccounts).where(eq(providerBankAccounts.providerId, providerId));
    return account;
  }

  async updateProviderBankAccount(id: number, account: Partial<ProviderBankAccount>): Promise<ProviderBankAccount | undefined> {
    const [updatedAccount] = await db.update(providerBankAccounts)
      .set(account)
      .where(eq(providerBankAccounts.id, id))
      .returning();
    return updatedAccount;
  }

  // ===============================
  // FIELDNATION-STYLE WORK ORDERS
  // ===============================

  async createWorkOrder(workOrder: InsertWorkOrder): Promise<WorkOrder> {
    const [newWorkOrder] = await db.insert(workOrders).values({
      ...workOrder,
      status: 'open',
      createdAt: new Date()
    }).returning();
    return newWorkOrder;
  }

  async getWorkOrder(id: number): Promise<WorkOrder | undefined> {
    const [workOrder] = await db.select().from(workOrders).where(eq(workOrders.id, id));
    return workOrder;
  }

  async getWorkOrderWithDetails(id: number): Promise<any | undefined> {
    const query = `
      SELECT 
        wo.*,
        c.first_name as client_first_name,
        c.last_name as client_last_name,
        c.email as client_email,
        sc.name as category_name,
        sp.id as assigned_provider_id,
        sp.user_id as assigned_provider_user_id,
        pu.first_name as assigned_provider_first_name,
        pu.last_name as assigned_provider_last_name,
        json_agg(
          CASE 
            WHEN jb.id IS NOT NULL THEN 
              json_build_object(
                'id', jb.id,
                'bidAmount', jb.bid_amount,
                'proposedStartDate', jb.proposed_start_date,
                'estimatedDuration', jb.estimated_duration,
                'message', jb.message,
                'status', jb.status,
                'submittedAt', jb.submitted_at,
                'provider', json_build_object(
                  'id', bp.id,
                  'userId', bp.user_id,
                  'user', json_build_object(
                    'firstName', bu.first_name,
                    'lastName', bu.last_name,
                    'email', bu.email
                  )
                )
              )
            ELSE NULL
          END
        ) FILTER (WHERE jb.id IS NOT NULL) as bids
      FROM work_orders wo
      LEFT JOIN users c ON wo.client_id = c.id
      LEFT JOIN service_categories sc ON wo.category_id = sc.id
      LEFT JOIN service_providers sp ON wo.assigned_provider_id = sp.id
      LEFT JOIN users pu ON sp.user_id = pu.id
      LEFT JOIN job_bids jb ON wo.id = jb.work_order_id
      LEFT JOIN service_providers bp ON jb.provider_id = bp.id
      LEFT JOIN users bu ON bp.user_id = bu.id
      WHERE wo.id = $1
      GROUP BY wo.id, c.id, sc.id, sp.id, pu.id
    `;

    const result = await pool.query(query, [id]);
    if (!result.rows.length) return undefined;

    const row = result.rows[0];
    return {
      id: row.id,
      clientId: row.client_id,
      categoryId: row.category_id,
      assignedProviderId: row.assigned_provider_id,
      title: row.title,
      description: row.description,
      jobType: row.job_type,
      siteAddress: row.site_address,
      siteCity: row.site_city,
      siteState: row.site_state,
      siteZip: row.site_zip,
      latitude: row.latitude,
      longitude: row.longitude,
      preferredStartDate: row.preferred_start_date,
      preferredEndDate: row.preferred_end_date,
      isFlexibleSchedule: row.is_flexible_schedule,
      estimatedDuration: row.estimated_duration,
      budget: row.budget,
      isBudgetFlexible: row.is_budget_flexible,
      skillsRequired: row.skills_required,
      toolsRequired: row.tools_required,
      experienceLevel: row.experience_level,
      siteContactName: row.site_contact_name,
      siteContactPhone: row.site_contact_phone,
      siteContactEmail: row.site_contact_email,
      specialInstructions: row.special_instructions,
      allowBidding: row.allow_bidding,
      status: row.status,
      createdAt: row.created_at,
      actualStartTime: row.actual_start_time,
      actualEndTime: row.actual_end_time,
      completedAt: row.completed_at,
      client: {
        firstName: row.client_first_name,
        lastName: row.client_last_name,
        email: row.client_email
      },
      category: {
        name: row.category_name
      },
      assignedProvider: row.assigned_provider_id ? {
        id: row.assigned_provider_id,
        userId: row.assigned_provider_user_id,
        user: {
          firstName: row.assigned_provider_first_name,
          lastName: row.assigned_provider_last_name
        }
      } : undefined,
      bids: row.bids || []
    };
  }

  async getWorkOrdersByClient(clientId: number): Promise<WorkOrder[]> {
    return db.select().from(workOrders)
      .where(eq(workOrders.clientId, clientId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getWorkOrdersByProvider(providerId: number): Promise<WorkOrder[]> {
    return db.select().from(workOrders)
      .where(eq(workOrders.assignedProviderId, providerId))
      .orderBy(desc(workOrders.createdAt));
  }

  async getAvailableWorkOrders(categoryId?: number): Promise<WorkOrder[]> {
    const baseQuery = db.select().from(workOrders)
      .where(eq(workOrders.status, 'open'));
    
    if (categoryId) {
      return baseQuery.where(eq(workOrders.categoryId, categoryId))
        .orderBy(desc(workOrders.createdAt));
    }
    
    return baseQuery.orderBy(desc(workOrders.createdAt));
  }

  async getAvailableWorkOrdersByLocation(lat: number, lng: number, radius: number, categoryId?: number): Promise<WorkOrder[]> {
    const earthRadius = 6371; // Earth radius in kilometers
    
    let query = `
      SELECT wo.*, 
        (${earthRadius} * acos(cos(radians($1)) * cos(radians(wo.latitude)) * 
        cos(radians(wo.longitude) - radians($2)) + sin(radians($1)) * 
        sin(radians(wo.latitude)))) AS distance
      FROM work_orders wo
      WHERE wo.status = 'open'
        AND wo.latitude IS NOT NULL 
        AND wo.longitude IS NOT NULL
        AND (${earthRadius} * acos(cos(radians($1)) * cos(radians(wo.latitude)) * 
        cos(radians(wo.longitude) - radians($2)) + sin(radians($1)) * 
        sin(radians(wo.latitude)))) <= $3
    `;
    
    const params = [lat, lng, radius];
    
    if (categoryId) {
      query += ` AND wo.category_id = $4`;
      params.push(categoryId);
    }
    
    query += ` ORDER BY distance ASC`;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  async updateWorkOrder(id: number, workOrder: Partial<WorkOrder>): Promise<WorkOrder | undefined> {
    const [updatedWorkOrder] = await db.update(workOrders)
      .set(workOrder)
      .where(eq(workOrders.id, id))
      .returning();
    return updatedWorkOrder;
  }

  // ===============================
  // JOB BIDDING SYSTEM
  // ===============================

  async createJobBid(bid: InsertJobBid): Promise<JobBid> {
    const [newBid] = await db.insert(jobBids).values({
      ...bid,
      status: 'pending',
      submittedAt: new Date()
    }).returning();
    return newBid;
  }

  async getJobBid(id: number): Promise<JobBid | undefined> {
    const [bid] = await db.select().from(jobBids).where(eq(jobBids.id, id));
    return bid;
  }

  async getJobBidsByWorkOrder(workOrderId: number): Promise<any[]> {
    const query = `
      SELECT 
        jb.*,
        sp.id as provider_id,
        sp.user_id as provider_user_id,
        sp.hourly_rate,
        sp.bio,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_image_url
      FROM job_bids jb
      JOIN service_providers sp ON jb.provider_id = sp.id
      JOIN users u ON sp.user_id = u.id
      WHERE jb.work_order_id = $1
      ORDER BY jb.submitted_at DESC
    `;

    const result = await pool.query(query, [workOrderId]);
    return result.rows.map(row => ({
      id: row.id,
      workOrderId: row.work_order_id,
      providerId: row.provider_id,
      bidAmount: row.bid_amount,
      proposedStartDate: row.proposed_start_date,
      estimatedDuration: row.estimated_duration,
      message: row.message,
      status: row.status,
      submittedAt: row.submitted_at,
      provider: {
        id: row.provider_id,
        userId: row.provider_user_id,
        hourlyRate: row.hourly_rate,
        bio: row.bio,
        user: {
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          profileImageUrl: row.profile_image_url
        }
      }
    }));
  }

  async getJobBidsByProvider(providerId: number): Promise<JobBid[]> {
    return db.select().from(jobBids)
      .where(eq(jobBids.providerId, providerId))
      .orderBy(desc(jobBids.submittedAt));
  }

  async updateJobBid(id: number, bid: Partial<JobBid>): Promise<JobBid | undefined> {
    const [updatedBid] = await db.update(jobBids)
      .set(bid)
      .where(eq(jobBids.id, id))
      .returning();
    return updatedBid;
  }

  // ===============================
  // PROVIDER SKILLS & EQUIPMENT
  // ===============================

  async createProviderSkill(skill: InsertProviderSkill): Promise<ProviderSkill> {
    const [newSkill] = await db.insert(providerSkills).values(skill).returning();
    return newSkill;
  }

  async getProviderSkills(providerId: number): Promise<ProviderSkill[]> {
    return db.select().from(providerSkills)
      .where(eq(providerSkills.providerId, providerId))
      .orderBy(providerSkills.skillName);
  }

  async deleteProviderSkill(id: number): Promise<boolean> {
    const result = await db.delete(providerSkills).where(eq(providerSkills.id, id));
    return result.rowCount > 0;
  }

  async createProviderEquipment(equipment: InsertProviderEquipment): Promise<ProviderEquipment> {
    const [newEquipment] = await db.insert(providerEquipment).values(equipment).returning();
    return newEquipment;
  }

  async getProviderEquipment(providerId: number): Promise<ProviderEquipment[]> {
    return db.select().from(providerEquipment)
      .where(eq(providerEquipment.providerId, providerId))
      .orderBy(providerEquipment.equipmentName);
  }

  async deleteProviderEquipment(id: number): Promise<boolean> {
    const result = await db.delete(providerEquipment).where(eq(providerEquipment.id, id));
    return result.rowCount > 0;
  }

  // Enhanced location methods for FieldNation
  async getServiceProvidersByLocation(lat: number, lng: number, radius: number, categoryId?: number): Promise<any[]> {
    const earthRadius = 6371; // Earth radius in kilometers
    
    let query = `
      SELECT sp.*, u.*, sc.name as category_name,
        (${earthRadius} * acos(cos(radians($1)) * cos(radians(u.latitude)) * 
        cos(radians(u.longitude) - radians($2)) + sin(radians($1)) * 
        sin(radians(u.latitude)))) AS distance
      FROM service_providers sp
      JOIN users u ON sp.user_id = u.id
      JOIN service_categories sc ON sp.category_id = sc.id
      WHERE sp.is_verified = true
        AND sp.has_approved_banking = true
        AND u.latitude IS NOT NULL 
        AND u.longitude IS NOT NULL
        AND (${earthRadius} * acos(cos(radians($1)) * cos(radians(u.latitude)) * 
        cos(radians(u.longitude) - radians($2)) + sin(radians($1)) * 
        sin(radians(u.latitude)))) <= $3
    `;
    
    const params = [lat, lng, radius];
    
    if (categoryId) {
      query += ` AND sp.category_id = $4`;
      params.push(categoryId);
    }
    
    query += ` ORDER BY distance ASC`;
    
    const result = await pool.query(query, params);
    return result.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      categoryId: row.category_id,
      hourlyRate: row.hourly_rate,
      bio: row.bio,
      isVerified: row.is_verified,
      hasApprovedBanking: row.has_approved_banking,
      distance: row.distance,
      user: {
        id: row.user_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        latitude: row.latitude,
        longitude: row.longitude,
        profileImageUrl: row.profile_image_url
      },
      category: {
        name: row.category_name
      }
    }));
  }
}

export const storage = new DatabaseStorage();
