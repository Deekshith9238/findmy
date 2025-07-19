CREATE TABLE "escrow_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"stripe_payment_intent_id" text NOT NULL,
	"stripe_transfer_id" text,
	"amount" double precision NOT NULL,
	"platform_fee" double precision NOT NULL,
	"tax" double precision NOT NULL,
	"total_amount" double precision NOT NULL,
	"payout_amount" double precision NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"held_at" timestamp,
	"approved_by" integer,
	"approved_at" timestamp,
	"released_at" timestamp,
	"refunded_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"data" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"stripe_account_id" text NOT NULL,
	"account_holder_name" text NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"routing_number" text NOT NULL,
	"account_type" text DEFAULT 'checking' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_completion_photos" (
	"id" serial PRIMARY KEY NOT NULL,
	"service_request_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"photo_url" text NOT NULL,
	"original_name" text NOT NULL,
	"description" text,
	"uploaded_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "scheduled_date" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "scheduled_time" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "latitude" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "longitude" double precision;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_account_holder_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_account_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_routing_number" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bank_account_type" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_bank_account_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "escrow_payments" ADD CONSTRAINT "escrow_payments_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_payments" ADD CONSTRAINT "escrow_payments_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_payments" ADD CONSTRAINT "escrow_payments_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "escrow_payments" ADD CONSTRAINT "escrow_payments_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_bank_accounts" ADD CONSTRAINT "provider_bank_accounts_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_completion_photos" ADD CONSTRAINT "work_completion_photos_service_request_id_service_requests_id_fk" FOREIGN KEY ("service_request_id") REFERENCES "public"."service_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_completion_photos" ADD CONSTRAINT "work_completion_photos_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;