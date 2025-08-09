CREATE TABLE "task_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_id" integer NOT NULL,
	"provider_id" integer NOT NULL,
	"quote_amount" double precision NOT NULL,
	"estimated_hours" integer NOT NULL,
	"message" text NOT NULL,
	"tools_provided" text,
	"additional_services" text,
	"price_approved" boolean DEFAULT false,
	"price_approved_at" timestamp,
	"price_approved_by" integer,
	"task_reviewed" boolean DEFAULT false,
	"task_reviewed_at" timestamp,
	"task_reviewed_by" integer,
	"customer_details_released" boolean DEFAULT false,
	"customer_details_released_at" timestamp,
	"customer_details_released_by" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "task_quotes" ADD CONSTRAINT "task_quotes_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_quotes" ADD CONSTRAINT "task_quotes_provider_id_service_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_quotes" ADD CONSTRAINT "task_quotes_price_approved_by_users_id_fk" FOREIGN KEY ("price_approved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_quotes" ADD CONSTRAINT "task_quotes_task_reviewed_by_users_id_fk" FOREIGN KEY ("task_reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_quotes" ADD CONSTRAINT "task_quotes_customer_details_released_by_users_id_fk" FOREIGN KEY ("customer_details_released_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;