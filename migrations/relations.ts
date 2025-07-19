import { relations } from "drizzle-orm/relations";
import { users, serviceProviders, serviceCategories, serviceRequests, reviews, serviceProviderDocuments, tasks, notifications, callCenterAssignments, escrowPayments, providerBankAccounts, workCompletionPhotos } from "./schema";

export const serviceProvidersRelations = relations(serviceProviders, ({one, many}) => ({
	user_userId: one(users, {
		fields: [serviceProviders.userId],
		references: [users.id],
		relationName: "serviceProviders_userId_users_id"
	}),
	serviceCategory: one(serviceCategories, {
		fields: [serviceProviders.categoryId],
		references: [serviceCategories.id]
	}),
	user_verifiedBy: one(users, {
		fields: [serviceProviders.verifiedBy],
		references: [users.id],
		relationName: "serviceProviders_verifiedBy_users_id"
	}),
	reviews: many(reviews),
	serviceProviderDocuments: many(serviceProviderDocuments),
	serviceRequests: many(serviceRequests),
	callCenterAssignments: many(callCenterAssignments),
	escrowPayments: many(escrowPayments),
	providerBankAccounts: many(providerBankAccounts),
	workCompletionPhotos: many(workCompletionPhotos),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	serviceProviders_userId: many(serviceProviders, {
		relationName: "serviceProviders_userId_users_id"
	}),
	serviceProviders_verifiedBy: many(serviceProviders, {
		relationName: "serviceProviders_verifiedBy_users_id"
	}),
	reviews: many(reviews),
	serviceProviderDocuments: many(serviceProviderDocuments),
	tasks: many(tasks),
	notifications: many(notifications),
	serviceRequests_clientId: many(serviceRequests, {
		relationName: "serviceRequests_clientId_users_id"
	}),
	serviceRequests_assignedToCallCenter: many(serviceRequests, {
		relationName: "serviceRequests_assignedToCallCenter_users_id"
	}),
	callCenterAssignments: many(callCenterAssignments),
	user: one(users, {
		fields: [users.createdBy],
		references: [users.id],
		relationName: "users_createdBy_users_id"
	}),
	users: many(users, {
		relationName: "users_createdBy_users_id"
	}),
	escrowPayments_clientId: many(escrowPayments, {
		relationName: "escrowPayments_clientId_users_id"
	}),
	escrowPayments_approvedBy: many(escrowPayments, {
		relationName: "escrowPayments_approvedBy_users_id"
	}),
}));

export const serviceCategoriesRelations = relations(serviceCategories, ({many}) => ({
	serviceProviders: many(serviceProviders),
	tasks: many(tasks),
}));

export const reviewsRelations = relations(reviews, ({one}) => ({
	serviceRequest: one(serviceRequests, {
		fields: [reviews.serviceRequestId],
		references: [serviceRequests.id]
	}),
	user: one(users, {
		fields: [reviews.clientId],
		references: [users.id]
	}),
	serviceProvider: one(serviceProviders, {
		fields: [reviews.providerId],
		references: [serviceProviders.id]
	}),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({one, many}) => ({
	reviews: many(reviews),
	task: one(tasks, {
		fields: [serviceRequests.taskId],
		references: [tasks.id]
	}),
	serviceProvider: one(serviceProviders, {
		fields: [serviceRequests.providerId],
		references: [serviceProviders.id]
	}),
	user_clientId: one(users, {
		fields: [serviceRequests.clientId],
		references: [users.id],
		relationName: "serviceRequests_clientId_users_id"
	}),
	user_assignedToCallCenter: one(users, {
		fields: [serviceRequests.assignedToCallCenter],
		references: [users.id],
		relationName: "serviceRequests_assignedToCallCenter_users_id"
	}),
	callCenterAssignments: many(callCenterAssignments),
	escrowPayments: many(escrowPayments),
	workCompletionPhotos: many(workCompletionPhotos),
}));

export const serviceProviderDocumentsRelations = relations(serviceProviderDocuments, ({one}) => ({
	serviceProvider: one(serviceProviders, {
		fields: [serviceProviderDocuments.providerId],
		references: [serviceProviders.id]
	}),
	user: one(users, {
		fields: [serviceProviderDocuments.verifiedBy],
		references: [users.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	user: one(users, {
		fields: [tasks.clientId],
		references: [users.id]
	}),
	serviceCategory: one(serviceCategories, {
		fields: [tasks.categoryId],
		references: [serviceCategories.id]
	}),
	serviceRequests: many(serviceRequests),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	user: one(users, {
		fields: [notifications.userId],
		references: [users.id]
	}),
}));

export const callCenterAssignmentsRelations = relations(callCenterAssignments, ({one}) => ({
	user: one(users, {
		fields: [callCenterAssignments.callCenterUserId],
		references: [users.id]
	}),
	serviceProvider: one(serviceProviders, {
		fields: [callCenterAssignments.providerId],
		references: [serviceProviders.id]
	}),
	serviceRequest: one(serviceRequests, {
		fields: [callCenterAssignments.serviceRequestId],
		references: [serviceRequests.id]
	}),
}));

export const escrowPaymentsRelations = relations(escrowPayments, ({one}) => ({
	serviceRequest: one(serviceRequests, {
		fields: [escrowPayments.serviceRequestId],
		references: [serviceRequests.id]
	}),
	user_clientId: one(users, {
		fields: [escrowPayments.clientId],
		references: [users.id],
		relationName: "escrowPayments_clientId_users_id"
	}),
	serviceProvider: one(serviceProviders, {
		fields: [escrowPayments.providerId],
		references: [serviceProviders.id]
	}),
	user_approvedBy: one(users, {
		fields: [escrowPayments.approvedBy],
		references: [users.id],
		relationName: "escrowPayments_approvedBy_users_id"
	}),
}));

export const providerBankAccountsRelations = relations(providerBankAccounts, ({one}) => ({
	serviceProvider: one(serviceProviders, {
		fields: [providerBankAccounts.providerId],
		references: [serviceProviders.id]
	}),
}));

export const workCompletionPhotosRelations = relations(workCompletionPhotos, ({one}) => ({
	serviceProvider: one(serviceProviders, {
		fields: [workCompletionPhotos.providerId],
		references: [serviceProviders.id]
	}),
	serviceRequest: one(serviceRequests, {
		fields: [workCompletionPhotos.serviceRequestId],
		references: [serviceRequests.id]
	}),
}));