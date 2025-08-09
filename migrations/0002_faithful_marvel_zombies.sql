CREATE TABLE "job_bids" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"bid_amount" double precision NOT NULL,
	"proposed_start_date" timestamp,
	"estimated_completion_hours" integer,
	"cover_letter" text,
	"additional_services" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"match_score" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "otp_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"otp_code" text NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_equipment" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"equipment_name" text NOT NULL,
	"equipment_type" text,
	"has_own" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "provider_skills" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider_id" integer NOT NULL,
	"skill_name" text NOT NULL,
	"experience_level" text NOT NULL,
	"years_of_experience" integer DEFAULT 0,
	"is_certified" boolean DEFAULT false,
	"certification_name" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"assigned_provider_id" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"job_type" text NOT NULL,
	"site_address" text NOT NULL,
	"site_city" text NOT NULL,
	"site_state" text NOT NULL,
	"site_zip" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"preferred_start_date" timestamp,
	"preferred_end_date" timestamp,
	"is_flexible_schedule" boolean DEFAULT true,
	"estimated_duration_hours" integer,
	"budget" double precision,
	"is_budget_flexible" boolean DEFAULT false,
	"skills_required" text,
	"tools_required" text,
	"experience_level" text,
	"site_contact_name" text,
	"site_contact_phone" text,
	"site_contact_email" text,
	"work_instructions" text,
	"safety_requirements" text,
	"access_instructions" text,
	"status" text DEFAULT 'open' NOT NULL,
	"allow_bidding" boolean DEFAULT true,
	"bidding_deadline" timestamp,
	"max_providers" integer DEFAULT 5,
	"actual_start_time" timestamp,
	"actual_end_time" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "location" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "job_bids" ADD CONSTRAINT "job_bids_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_bids" ADD CONSTRAINT "job_bids_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_equipment" ADD CONSTRAINT "provider_equipment_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_skills" ADD CONSTRAINT "provider_skills_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_category_id_service_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."service_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_assigned_provider_id_service_providers_id_fk" FOREIGN KEY ("assigned_provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "scheduled_date";--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN "scheduled_time";