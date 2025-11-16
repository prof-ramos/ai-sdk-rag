ALTER TABLE "resources" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "document_type" varchar(100);--> statement-breakpoint
ALTER TABLE "resources" ADD COLUMN "source_url" text;