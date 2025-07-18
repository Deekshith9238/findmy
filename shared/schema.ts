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
export const users = pgTable("users", {
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
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User relations
export const usersRelations = relations(users, ({ many, one }) => ({
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



// Tasks or job postings
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  categoryId: integer("category_id").notNull().references(() => serviceCategories.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
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

// Extended user schema with mandatory bank details
export const insertUserWithBankSchema = insertUserSchema.extend({
  bankAccountHolderName: z.string().min(1, "Bank account holder name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  bankAccountNumber: z.string().min(4, "Bank account number is required"),
  bankRoutingNumber: z.string().length(9, "Routing number must be 9 digits"),
  bankAccountType: z.enum(['checking', 'savings']),
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
  completedAt: true
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
export type InsertUserWithBank = z.infer<typeof insertUserWithBankSchema>;
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
