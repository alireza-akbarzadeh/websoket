CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'finished');--> statement-breakpoint
CREATE TABLE "commentary" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "commentary_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"match_id" uuid NOT NULL,
	"minute" integer,
	"sequence" integer NOT NULL,
	"period" varchar(20),
	"event_type" varchar(40) NOT NULL,
	"actor" varchar(120),
	"team" varchar(120),
	"message" text NOT NULL,
	"metadata" jsonb,
	"tags" text[],
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sport" varchar(50) NOT NULL,
	"home_team" varchar(120) NOT NULL,
	"away_team" varchar(120) NOT NULL,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone,
	"home_score" integer DEFAULT 0 NOT NULL,
	"away_score" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_scores_non_negative" CHECK ("matches"."home_score" >= 0 AND "matches"."away_score" >= 0),
	CONSTRAINT "matches_end_after_start" CHECK ("matches"."end_time" IS NULL OR "matches"."end_time" >= "matches"."start_time")
);
--> statement-breakpoint
ALTER TABLE "commentary" ADD CONSTRAINT "commentary_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "commentary_match_id_sequence_idx" ON "commentary" USING btree ("match_id","sequence");--> statement-breakpoint
CREATE INDEX "commentary_match_id_created_at_idx" ON "commentary" USING btree ("match_id","created_at");--> statement-breakpoint
CREATE INDEX "commentary_tags_idx" ON "commentary" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "matches_status_start_time_idx" ON "matches" USING btree ("status","start_time");--> statement-breakpoint
CREATE INDEX "matches_sport_start_time_idx" ON "matches" USING btree ("sport","start_time");