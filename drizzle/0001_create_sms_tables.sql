-- Create SMS tables for DNsms CRM
-- Generated for initial SMS functionality

-- Create customers table
CREATE TABLE IF NOT EXISTS "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text NOT NULL,
	"email" text,
	"state" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"message" text NOT NULL,
	"target_state" text,
	"schedule_time" timestamp,
	"status" text DEFAULT 'draft' NOT NULL,
	"total_recipients" integer DEFAULT 0,
	"sent_count" integer DEFAULT 0,
	"delivered_count" integer DEFAULT 0,
	"failed_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" text NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"customer_id" text NOT NULL,
	"phone" text NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"twilio_sid" text,
	"twilio_status" text,
	"error_code" text,
	"error_message" text,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "messages_twilio_sid_unique" UNIQUE("twilio_sid")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_customers_user_id" ON "customers" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_customers_state" ON "customers" ("state");
CREATE INDEX IF NOT EXISTS "idx_customers_phone" ON "customers" ("phone");

CREATE INDEX IF NOT EXISTS "idx_campaigns_user_id" ON "campaigns" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_campaigns_status" ON "campaigns" ("status");
CREATE INDEX IF NOT EXISTS "idx_campaigns_schedule_time" ON "campaigns" ("schedule_time");

CREATE INDEX IF NOT EXISTS "idx_messages_campaign_id" ON "messages" ("campaign_id");
CREATE INDEX IF NOT EXISTS "idx_messages_customer_id" ON "messages" ("customer_id");
CREATE INDEX IF NOT EXISTS "idx_messages_status" ON "messages" ("status");
CREATE INDEX IF NOT EXISTS "idx_messages_twilio_sid" ON "messages" ("twilio_sid");

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "messages" ADD CONSTRAINT "messages_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;