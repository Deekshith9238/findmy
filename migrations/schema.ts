import { pgTable, foreignKey, serial, integer, text, doublePrecision, timestamp, unique, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const serviceProviders = pgTable("service_providers", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	categoryId: integer("category_id").notNull(),
	bio: text(),
	hourlyRate: doublePrecision("hourly_rate").notNull(),
	yearsOfExperience: integer("years_of_experience"),
	availability: text(),
	rating: doublePrecision(),
	completedJobs: integer("completed_jobs").default(0),
	verificationStatus: text("verification_status").default('pending').notNull(),
	verifiedBy: integer("verified_by"),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "service_providers_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [serviceCategories.id],
			name: "service_providers_category_id_service_categories_id_fk"
		}),
	foreignKey({
			columns: [table.verifiedBy],
			foreignColumns: [users.id],
			name: "service_providers_verified_by_users_id_fk"
		}),
]);

export const reviews = pgTable("reviews", {
	id: serial().primaryKey().notNull(),
	serviceRequestId: integer("service_request_id").notNull(),
	clientId: integer("client_id").notNull(),
	providerId: integer("provider_id").notNull(),
	rating: integer().notNull(),
	comment: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.serviceRequestId],
			foreignColumns: [serviceRequests.id],
			name: "reviews_service_request_id_service_requests_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [users.id],
			name: "reviews_client_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [serviceProviders.id],
			name: "reviews_provider_id_service_providers_id_fk"
		}),
]);

export const serviceProviderDocuments = pgTable("service_provider_documents", {
	id: serial().primaryKey().notNull(),
	providerId: integer("provider_id").notNull(),
	documentType: text("document_type").notNull(),
	documentUrl: text("document_url").notNull(),
	originalName: text("original_name").notNull(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
	verificationStatus: text("verification_status").default('pending').notNull(),
	verifiedBy: integer("verified_by"),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	notes: text(),
}, (table) => [
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [serviceProviders.id],
			name: "service_provider_documents_provider_id_service_providers_id_fk"
		}),
	foreignKey({
			columns: [table.verifiedBy],
			foreignColumns: [users.id],
			name: "service_provider_documents_verified_by_users_id_fk"
		}),
]);

export const tasks = pgTable("tasks", {
	id: serial().primaryKey().notNull(),
	clientId: integer("client_id").notNull(),
	categoryId: integer("category_id").notNull(),
	title: text().notNull(),
	description: text().notNull(),
	location: text().notNull(),
	latitude: doublePrecision(),
	longitude: doublePrecision(),
	budget: doublePrecision(),
	status: text().default('open').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	scheduledDate: text("scheduled_date"),
	scheduledTime: text("scheduled_time"),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [users.id],
			name: "tasks_client_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [serviceCategories.id],
			name: "tasks_category_id_service_categories_id_fk"
		}),
]);

export const serviceCategories = pgTable("service_categories", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	icon: text(),
}, (table) => [
	unique("service_categories_name_unique").on(table.name),
]);

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	data: text(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notifications_user_id_users_id_fk"
		}),
]);

export const serviceRequests = pgTable("service_requests", {
	id: serial().primaryKey().notNull(),
	taskId: integer("task_id"),
	providerId: integer("provider_id"),
	clientId: integer("client_id").notNull(),
	status: text().default('pending').notNull(),
	message: text(),
	budget: doublePrecision(),
	scheduledDate: timestamp("scheduled_date", { mode: 'string' }),
	assignedToCallCenter: integer("assigned_to_call_center"),
	assignedAt: timestamp("assigned_at", { mode: 'string' }),
	contactedAt: timestamp("contacted_at", { mode: 'string' }),
	callNotes: text("call_notes"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "service_requests_task_id_tasks_id_fk"
		}),
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [serviceProviders.id],
			name: "service_requests_provider_id_service_providers_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [users.id],
			name: "service_requests_client_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.assignedToCallCenter],
			foreignColumns: [users.id],
			name: "service_requests_assigned_to_call_center_users_id_fk"
		}),
]);

export const callCenterAssignments = pgTable("call_center_assignments", {
	id: serial().primaryKey().notNull(),
	serviceRequestId: integer("service_request_id").notNull(),
	callCenterUserId: integer("call_center_user_id").notNull(),
	providerId: integer("provider_id").notNull(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
	status: text().default('assigned').notNull(),
	attempts: integer().default(0),
	lastAttemptAt: timestamp("last_attempt_at", { mode: 'string' }),
	notes: text(),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.callCenterUserId],
			foreignColumns: [users.id],
			name: "call_center_assignments_call_center_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [serviceProviders.id],
			name: "call_center_assignments_provider_id_service_providers_id_fk"
		}),
	foreignKey({
			columns: [table.serviceRequestId],
			foreignColumns: [serviceRequests.id],
			name: "call_center_assignments_service_request_id_service_requests_id_"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	email: text().notNull(),
	password: text().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	role: text().default('client').notNull(),
	profilePicture: text("profile_picture"),
	phoneNumber: text("phone_number"),
	latitude: doublePrecision(),
	longitude: doublePrecision(),
	address: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	bankAccountHolderName: text("bank_account_holder_name"),
	bankName: text("bank_name"),
	bankAccountNumber: text("bank_account_number"),
	bankRoutingNumber: text("bank_routing_number"),
	bankAccountType: text("bank_account_type"),
	isBankAccountVerified: boolean("is_bank_account_verified").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [table.id],
			name: "users_created_by_users_id_fk"
		}),
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
]);

export const escrowPayments = pgTable("escrow_payments", {
	id: serial().primaryKey().notNull(),
	serviceRequestId: integer("service_request_id").notNull(),
	clientId: integer("client_id").notNull(),
	providerId: integer("provider_id").notNull(),
	stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
	stripeTransferId: text("stripe_transfer_id"),
	amount: doublePrecision().notNull(),
	platformFee: doublePrecision("platform_fee").notNull(),
	tax: doublePrecision().notNull(),
	totalAmount: doublePrecision("total_amount").notNull(),
	payoutAmount: doublePrecision("payout_amount").notNull(),
	status: text().default('pending').notNull(),
	heldAt: timestamp("held_at", { mode: 'string' }),
	approvedBy: integer("approved_by"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	releasedAt: timestamp("released_at", { mode: 'string' }),
	refundedAt: timestamp("refunded_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.serviceRequestId],
			foreignColumns: [serviceRequests.id],
			name: "escrow_payments_service_request_id_service_requests_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [users.id],
			name: "escrow_payments_client_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [serviceProviders.id],
			name: "escrow_payments_provider_id_service_providers_id_fk"
		}),
	foreignKey({
			columns: [table.approvedBy],
			foreignColumns: [users.id],
			name: "escrow_payments_approved_by_users_id_fk"
		}),
]);

export const providerBankAccounts = pgTable("provider_bank_accounts", {
	id: serial().primaryKey().notNull(),
	providerId: integer("provider_id").notNull(),
	stripeAccountId: text("stripe_account_id").notNull(),
	accountHolderName: text("account_holder_name").notNull(),
	bankName: text("bank_name").notNull(),
	accountNumber: text("account_number").notNull(),
	routingNumber: text("routing_number").notNull(),
	accountType: text("account_type").default('checking').notNull(),
	isVerified: boolean("is_verified").default(false).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [serviceProviders.id],
			name: "provider_bank_accounts_provider_id_service_providers_id_fk"
		}),
]);

export const workCompletionPhotos = pgTable("work_completion_photos", {
	id: serial().primaryKey().notNull(),
	serviceRequestId: integer("service_request_id").notNull(),
	providerId: integer("provider_id").notNull(),
	photoUrl: text("photo_url").notNull(),
	originalName: text("original_name").notNull(),
	description: text(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [serviceProviders.id],
			name: "work_completion_photos_provider_id_service_providers_id_fk"
		}),
	foreignKey({
			columns: [table.serviceRequestId],
			foreignColumns: [serviceRequests.id],
			name: "work_completion_photos_service_request_id_service_requests_id_f"
		}),
]);
