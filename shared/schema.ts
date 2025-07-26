import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User roles enum
export const userRoles = {
  ADMIN: "admin",
  SERVICE_VERIFIER: "service_verifier", 
  CALL_CENTER: "call_center",
  SERVICE_PROVIDER: "service_provider",
  CLIENT: "client",
  PAYMENT_APPROVER: "payment_approver"
} as const;

// User table for all user types
export const users: any = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default(userRoles.CLIENT),
  profilePicture: text("profile_picture"),
  phoneNumber: text("phone_number"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  address: text("address"),
  // Bank details for refund purposes
  bankAccountHolderName: text("bank_account_holder_name"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankRoutingNumber: text("bank_routing_number"),
  bankAccountType: text("bank_account_type"), // 'checking' or 'savings'
  isBankAccountVerified: boolean("is_bank_account_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  isEmailVerified: boolean("is_email_verified").notNull().default(false),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// OTP verification table for email verification and additional security
export const otpVerifications = pgTable("otp_verifications", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  otpCode: text("otp_code").notNull(),
  purpose: text("purpose").notNull(), // 'email_verification', 'login_verification', 'password_reset'
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").notNull().default(false),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User relations
export const usersRelations: any = relations(users, ({ many, one }) => ({
  providerProfile: one(serviceProviders, {
    fields: [users.id],
    references: [serviceProviders.userId],
  }),
  clientTasks: many(tasks),
  clientServiceRequests: many(serviceRequests, { relationName: 'client' }),
  clientReviews: many(reviews, { relationName: 'client' }),
  verifiedProviders: many(serviceProviders, { relationName: 'verifier' }),
  verifiedDocuments: many(serviceProviderDocuments, { relationName: 'verifier' }),
  assignedServiceRequests: many(serviceRequests, { relationName: 'callCenter' }),
  notifications: many(notifications),
}));

// Service categories
export const serviceCategories = pgTable("service_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon"),
});

// Service categories relations
export const serviceCategoriesRelations = relations(serviceCategories, ({ many }) => ({
  providers: many(serviceProviders),
  tasks: many(tasks),
}));

// Verification status enum
export const verificationStatus = {
  PENDING: "pending",
  APPROVED: "approved", 
  REJECTED: "rejected",
  UNDER_REVIEW: "under_review"
} as const;

// Service provider profiles
export const serviceProviders = pgTable("service_providers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  categoryId: integer("category_id").notNull().references(() => serviceCategories.id),
  bio: text("bio"),
  hourlyRate: doublePrecision("hourly_rate").notNull(),
  yearsOfExperience: integer("years_of_experience"),
  availability: text("availability"),
  rating: doublePrecision("rating"),
  completedJobs: integer("completed_jobs").default(0),
  verificationStatus: text("verification_status").notNull().default(verificationStatus.PENDING),
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  rejectionReason: text("rejection_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service provider documents table
export const serviceProviderDocuments = pgTable("service_provider_documents", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => serviceProviders.id),
  documentType: text("document_type").notNull(), // "identity", "license", "certificate", etc.
  documentUrl: text("document_url").notNull(),
  originalName: text("original_name").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  verificationStatus: text("verification_status").notNull().default(verificationStatus.PENDING),
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  notes: text("notes"),
});

// Payment escrow system tables
export const paymentStatuses = {
  PENDING: "pending",
  HELD: "held",
  APPROVED: "approved",
  RELEASED: "released",
  REFUNDED: "refunded",
  FAILED: "failed"
} as const;

// Escrow payments table
export const escrowPayments = pgTable("escrow_payments", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  providerId: integer("provider_id").notNull().references(() => serviceProviders.id),
  stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
  stripeTransferId: text("stripe_transfer_id"),
  amount: doublePrecision("amount").notNull(), // Base service amount
  platformFee: doublePrecision("platform_fee").notNull(), // Platform commission
  tax: doublePrecision("tax").notNull(), // Tax amount
  totalAmount: doublePrecision("total_amount").notNull(), // Total charged to client
  payoutAmount: doublePrecision("payout_amount").notNull(), // Amount to be paid to provider (amount - platform fee)
  status: text("status").notNull().default(paymentStatuses.PENDING),
  heldAt: timestamp("held_at"),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  releasedAt: timestamp("released_at"),
  refundedAt: timestamp("refunded_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Work completion photos
export const workCompletionPhotos = pgTable("work_completion_photos", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  providerId: integer("provider_id").notNull().references(() => serviceProviders.id),
  photoUrl: text("photo_url").notNull(),
  originalName: text("original_name").notNull(),
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

// Provider bank accounts for payouts
export const providerBankAccounts = pgTable("provider_bank_accounts", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => serviceProviders.id),
  stripeAccountId: text("stripe_account_id").notNull(), // Stripe Connect account ID
  accountHolderName: text("account_holder_name").notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(), // Encrypted/masked
  routingNumber: text("routing_number").notNull(),
  accountType: text("account_type").notNull().default("checking"), // checking, savings
  isVerified: boolean("is_verified").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Service providers relations
export const serviceProvidersRelations = relations(serviceProviders, ({ one, many }) => ({
  user: one(users, {
    fields: [serviceProviders.userId],
    references: [users.id],
  }),
  category: one(serviceCategories, {
    fields: [serviceProviders.categoryId],
    references: [serviceCategories.id],
  }),
  verifier: one(users, {
    fields: [serviceProviders.verifiedBy],
    references: [users.id],
    relationName: 'verifier',
  }),
  documents: many(serviceProviderDocuments),
  serviceRequests: many(serviceRequests),
  reviews: many(reviews),
  // FieldNation-style relations
  skills: many(providerSkills),
  equipment: many(providerEquipment),
  bids: many(jobBids),
  assignedWorkOrders: many(workOrders),
}));

// Service provider documents relations
export const serviceProviderDocumentsRelations = relations(serviceProviderDocuments, ({ one }) => ({
  provider: one(serviceProviders, {
    fields: [serviceProviderDocuments.providerId],
    references: [serviceProviders.id],
  }),
  verifier: one(users, {
    fields: [serviceProviderDocuments.verifiedBy],
    references: [users.id],
    relationName: 'verifier',
  }),
}));

// Escrow payments relations
export const escrowPaymentsRelations = relations(escrowPayments, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [escrowPayments.serviceRequestId],
    references: [serviceRequests.id],
  }),
  client: one(users, {
    fields: [escrowPayments.clientId],
    references: [users.id],
    relationName: 'client',
  }),
  provider: one(serviceProviders, {
    fields: [escrowPayments.providerId],
    references: [serviceProviders.id],
  }),
  approver: one(users, {
    fields: [escrowPayments.approvedBy],
    references: [users.id],
    relationName: 'approver',
  }),
}));

// Work completion photos relations
export const workCompletionPhotosRelations = relations(workCompletionPhotos, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [workCompletionPhotos.serviceRequestId],
    references: [serviceRequests.id],
  }),
  provider: one(serviceProviders, {
    fields: [workCompletionPhotos.providerId],
    references: [serviceProviders.id],
  }),
}));

// Provider bank accounts relations
export const providerBankAccountsRelations = relations(providerBankAccounts, ({ one }) => ({
  provider: one(serviceProviders, {
    fields: [providerBankAccounts.providerId],
    references: [serviceProviders.id],
  }),
}));



// Job types following FieldNation model
export const jobTypes = {
  INSTALLATION: "installation",
  REPAIR: "repair", 
  MAINTENANCE: "maintenance",
  SETUP: "setup",
  TROUBLESHOOTING: "troubleshooting",
  INSPECTION: "inspection",
  CONSULTATION: "consultation"
} as const;

// Job status following FieldNation workflow
export const jobStatus = {
  OPEN: "open",
  BIDDING: "bidding", 
  ASSIGNED: "assigned",
  IN_PROGRESS: "in_progress",
  AWAITING_APPROVAL: "awaiting_approval",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
} as const;

// Work Orders (enhanced version of tasks following FieldNation model)
export const workOrders = pgTable("work_orders", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  categoryId: integer("category_id").notNull().references(() => serviceCategories.id),
  assignedProviderId: integer("assigned_provider_id").references(() => serviceProviders.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  jobType: text("job_type").notNull(),
  
  // Location details
  siteAddress: text("site_address").notNull(),
  siteCity: text("site_city").notNull(),
  siteState: text("site_state").notNull(),
  siteZip: text("site_zip").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  
  // Scheduling
  preferredStartDate: timestamp("preferred_start_date"),
  preferredEndDate: timestamp("preferred_end_date"),
  isFlexibleSchedule: boolean("is_flexible_schedule").default(true),
  estimatedDuration: integer("estimated_duration_hours"),
  
  // Budget and payment
  budget: doublePrecision("budget"),
  isBudgetFlexible: boolean("is_budget_flexible").default(false),
  
  // Requirements
  skillsRequired: text("skills_required"), // JSON array of required skills
  toolsRequired: text("tools_required"), // JSON array of required tools
  experienceLevel: text("experience_level"), // "entry", "intermediate", "expert"
  
  // Contact information
  siteContactName: text("site_contact_name"),
  siteContactPhone: text("site_contact_phone"),
  siteContactEmail: text("site_contact_email"),
  
  // Work order specifics
  workInstructions: text("work_instructions"),
  safetyRequirements: text("safety_requirements"),
  accessInstructions: text("access_instructions"),
  
  status: text("status").notNull().default(jobStatus.OPEN),
  
  // Bidding settings
  allowBidding: boolean("allow_bidding").default(true),
  biddingDeadline: timestamp("bidding_deadline"),
  maxProviders: integer("max_providers").default(5),
  
  // Completion tracking
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  completedAt: timestamp("completed_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// For backward compatibility, keep tasks table but mark as deprecated
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  categoryId: integer("category_id").notNull().references(() => serviceCategories.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  budget: doublePrecision("budget"),
  scheduledDate: text("scheduled_date"),
  scheduledTime: text("scheduled_time"),
  status: text("status").notNull().default("open"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Tasks relations
export const tasksRelations = relations(tasks, ({ one, many }) => ({
  client: one(users, {
    fields: [tasks.clientId],
    references: [users.id],
  }),
  category: one(serviceCategories, {
    fields: [tasks.categoryId],
    references: [serviceCategories.id],
  }),
  serviceRequests: many(serviceRequests),
}));

// Service request status enum
export const serviceRequestStatus = {
  PENDING: "pending",
  ASSIGNED_TO_CALL_CENTER: "assigned_to_call_center",
  CALLING_PROVIDER: "calling_provider", 
  PROVIDER_CONTACTED: "provider_contacted",
  ACCEPTED: "accepted",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled"
} as const;

// Service requests
export const serviceRequests = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id),
  providerId: integer("provider_id").references(() => serviceProviders.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  status: text("status").notNull().default(serviceRequestStatus.PENDING),
  message: text("message"),
  budget: doublePrecision("budget"),
  scheduledDate: timestamp("scheduled_date"),
  assignedToCallCenter: integer("assigned_to_call_center").references(() => users.id),
  assignedAt: timestamp("assigned_at"),
  contactedAt: timestamp("contacted_at"),
  callNotes: text("call_notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Call center assignments table
export const callCenterAssignments = pgTable("call_center_assignments", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  callCenterUserId: integer("call_center_user_id").notNull().references(() => users.id),
  providerId: integer("provider_id").notNull().references(() => serviceProviders.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  status: text("status").notNull().default("assigned"), // assigned, calling, contacted, completed, failed
  attempts: integer("attempts").default(0),
  lastAttemptAt: timestamp("last_attempt_at"),
  notes: text("notes"),
  completedAt: timestamp("completed_at"),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // task_posted, service_request, call_center_assignment, etc.
  title: text("title").notNull(),
  message: text("message").notNull(),
  data: text("data"), // JSON string with additional data
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Job Bids (FieldNation-style bidding system)
export const jobBids = pgTable("job_bids", {
  id: serial("id").primaryKey(),
  workOrderId: integer("work_order_id").notNull().references(() => workOrders.id),
  providerId: integer("provider_id").notNull().references(() => serviceProviders.id),
  
  // Bid details
  bidAmount: doublePrecision("bid_amount").notNull(),
  proposedStartDate: timestamp("proposed_start_date"),
  estimatedCompletionTime: integer("estimated_completion_hours"),
  
  // Provider's proposal
  coverLetter: text("cover_letter"), // Why they're the right fit
  additionalServices: text("additional_services"), // JSON array of extra services offered
  
  // Bid status
  status: text("status").notNull().default("pending"), // pending, accepted, rejected, withdrawn
  
  // Auto-matching score (based on location, skills, ratings, etc.)
  matchScore: integer("match_score").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Provider Skills (for better job matching)
export const providerSkills = pgTable("provider_skills", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => serviceProviders.id),
  skillName: text("skill_name").notNull(),
  experienceLevel: text("experience_level").notNull(), // "beginner", "intermediate", "expert"
  yearsOfExperience: integer("years_of_experience").default(0),
  isCertified: boolean("is_certified").default(false),
  certificationName: text("certification_name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Provider Equipment/Tools
export const providerEquipment = pgTable("provider_equipment", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull().references(() => serviceProviders.id),
  equipmentName: text("equipment_name").notNull(),
  equipmentType: text("equipment_type"), // "vehicle", "tool", "diagnostic_equipment", etc.
  hasOwn: boolean("has_own").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Work Order Relations
export const workOrdersRelations = relations(workOrders, ({ one, many }) => ({
  client: one(users, {
    fields: [workOrders.clientId],
    references: [users.id],
    relationName: 'client',
  }),
  category: one(serviceCategories, {
    fields: [workOrders.categoryId],
    references: [serviceCategories.id],
  }),
  assignedProvider: one(serviceProviders, {
    fields: [workOrders.assignedProviderId],
    references: [serviceProviders.id],
  }),
  bids: many(jobBids),
  completionPhotos: many(workCompletionPhotos),
}));

// Job Bids Relations
export const jobBidsRelations = relations(jobBids, ({ one }) => ({
  workOrder: one(workOrders, {
    fields: [jobBids.workOrderId],
    references: [workOrders.id],
  }),
  provider: one(serviceProviders, {
    fields: [jobBids.providerId],
    references: [serviceProviders.id],
  }),
}));

// Provider Skills Relations
export const providerSkillsRelations = relations(providerSkills, ({ one }) => ({
  provider: one(serviceProviders, {
    fields: [providerSkills.providerId],
    references: [serviceProviders.id],
  }),
}));

// Provider Equipment Relations
export const providerEquipmentRelations = relations(providerEquipment, ({ one }) => ({
  provider: one(serviceProviders, {
    fields: [providerEquipment.providerId],
    references: [serviceProviders.id],
  }),
}));

// Service requests relations
export const serviceRequestsRelations = relations(serviceRequests, ({ one, many }) => ({
  task: one(tasks, {
    fields: [serviceRequests.taskId],
    references: [tasks.id],
  }),
  provider: one(serviceProviders, {
    fields: [serviceRequests.providerId],
    references: [serviceProviders.id],
  }),
  client: one(users, {
    fields: [serviceRequests.clientId],
    references: [users.id],
    relationName: 'client',
  }),
  callCenterUser: one(users, {
    fields: [serviceRequests.assignedToCallCenter],
    references: [users.id],
    relationName: 'callCenter',
  }),
  reviews: many(reviews),
}));

// Reviews
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  serviceRequestId: integer("service_request_id").notNull().references(() => serviceRequests.id),
  clientId: integer("client_id").notNull().references(() => users.id),
  providerId: integer("provider_id").notNull().references(() => serviceProviders.id),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews relations
export const reviewsRelations = relations(reviews, ({ one }) => ({
  serviceRequest: one(serviceRequests, {
    fields: [reviews.serviceRequestId],
    references: [serviceRequests.id],
  }),
  client: one(users, {
    fields: [reviews.clientId],
    references: [users.id],
    relationName: 'client',
  }),
  provider: one(serviceProviders, {
    fields: [reviews.providerId],
    references: [serviceProviders.id],
  }),
}));

// Notifications relations
export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Payment approver schema - can only be created by admin (no bank details required)
export const insertPaymentApproverSchema = insertUserSchema.extend({
  role: z.literal(userRoles.PAYMENT_APPROVER),
  createdBy: z.number().positive("Payment approvers must be created by admin"),
});

export const insertServiceCategorySchema = createInsertSchema(serviceCategories).omit({
  id: true
});

export const insertServiceProviderSchema = createInsertSchema(serviceProviders).omit({
  id: true,
  completedJobs: true,
  rating: true
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  scheduledDate: true,
  scheduledTime: true
}).extend({
  location: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional()
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  createdAt: true
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true
});

export const insertServiceProviderDocumentSchema = createInsertSchema(serviceProviderDocuments).omit({
  id: true,
  uploadedAt: true,
  verifiedAt: true
});

// FieldNation-style schemas
export const insertWorkOrderSchema = createInsertSchema(workOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  actualStartTime: true,
  actualEndTime: true
});

export const insertJobBidSchema = createInsertSchema(jobBids).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  matchScore: true
});

export const insertProviderSkillSchema = createInsertSchema(providerSkills).omit({
  id: true,
  createdAt: true
});

export const insertProviderEquipmentSchema = createInsertSchema(providerEquipment).omit({
  id: true,
  createdAt: true
});

export const insertCallCenterAssignmentSchema = createInsertSchema(callCenterAssignments).omit({
  id: true,
  assignedAt: true,
  completedAt: true,
  lastAttemptAt: true
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true
});

export const insertEscrowPaymentSchema = createInsertSchema(escrowPayments).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWorkCompletionPhotoSchema = createInsertSchema(workCompletionPhotos).omit({
  id: true,
  uploadedAt: true
});

export const insertProviderBankAccountSchema = createInsertSchema(providerBankAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertPaymentApprover = z.infer<typeof insertPaymentApproverSchema>;
export type User = typeof users.$inferSelect;

export type InsertServiceCategory = z.infer<typeof insertServiceCategorySchema>;
export type ServiceCategory = typeof serviceCategories.$inferSelect;

export type InsertServiceProvider = z.infer<typeof insertServiceProviderSchema>;
export type ServiceProvider = typeof serviceProviders.$inferSelect;

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export type InsertServiceProviderDocument = z.infer<typeof insertServiceProviderDocumentSchema>;
export type ServiceProviderDocument = typeof serviceProviderDocuments.$inferSelect;

export type InsertCallCenterAssignment = z.infer<typeof insertCallCenterAssignmentSchema>;
export type CallCenterAssignment = typeof callCenterAssignments.$inferSelect;

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

export type InsertEscrowPayment = z.infer<typeof insertEscrowPaymentSchema>;
export type EscrowPayment = typeof escrowPayments.$inferSelect;

export type InsertWorkCompletionPhoto = z.infer<typeof insertWorkCompletionPhotoSchema>;
export type WorkCompletionPhoto = typeof workCompletionPhotos.$inferSelect;

export type InsertProviderBankAccount = z.infer<typeof insertProviderBankAccountSchema>;
export type ProviderBankAccount = typeof providerBankAccounts.$inferSelect;

// User role types
export type UserRole = typeof userRoles[keyof typeof userRoles];

// Payment status types
export type PaymentStatus = typeof paymentStatuses[keyof typeof paymentStatuses];

// Extended provider type with user info
export type ServiceProviderWithUser = ServiceProvider & {
  user: User;
  category: ServiceCategory;
};

// Extended task type with user and category info
export type TaskWithDetails = Task & {
  client: User;
  category: ServiceCategory;
};

// Service provider with documents
export type ServiceProviderWithDocuments = ServiceProvider & {
  user: User;
  category: ServiceCategory;
  documents: ServiceProviderDocument[];
};

// FieldNation-style types
export type InsertWorkOrder = z.infer<typeof insertWorkOrderSchema>;
export type WorkOrder = typeof workOrders.$inferSelect;

export type InsertJobBid = z.infer<typeof insertJobBidSchema>;
export type JobBid = typeof jobBids.$inferSelect;

export type InsertProviderSkill = z.infer<typeof insertProviderSkillSchema>;
export type ProviderSkill = typeof providerSkills.$inferSelect;

export type InsertProviderEquipment = z.infer<typeof insertProviderEquipmentSchema>;
export type ProviderEquipment = typeof providerEquipment.$inferSelect;

// Job type and status types
export type JobType = typeof jobTypes[keyof typeof jobTypes];
export type JobStatus = typeof jobStatus[keyof typeof jobStatus];

// Extended work order with related data
export type WorkOrderWithDetails = WorkOrder & {
  client: User;
  category: ServiceCategory;
  assignedProvider?: ServiceProvider & { user: User };
  bids: (JobBid & { provider: ServiceProvider & { user: User } })[];
};

// Provider with skills and equipment
export type ServiceProviderWithSkills = ServiceProvider & {
  user: User;
  category: ServiceCategory;
  skills: ProviderSkill[];
  equipment: ProviderEquipment[];
};

// Job bid with provider details
export type JobBidWithProvider = JobBid & {
  provider: ServiceProvider & { user: User };
};

// OTP verification schemas
export const insertOtpVerificationSchema = createInsertSchema(otpVerifications);
export type InsertOtpVerification = z.infer<typeof insertOtpVerificationSchema>;
export type OtpVerification = typeof otpVerifications.$inferSelect;
