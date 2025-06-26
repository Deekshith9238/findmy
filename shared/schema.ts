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
  CLIENT: "client"
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



// Tasks or job postings
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => users.id),
  categoryId: integer("category_id").notNull().references(() => serviceCategories.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  location: text("location").notNull(),
  budget: doublePrecision("budget"),
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
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

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
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

// User role types
export type UserRole = typeof userRoles[keyof typeof userRoles];

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
