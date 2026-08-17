ALTER TABLE "SystemAnnouncement"
  ADD COLUMN "startsAt" TIMESTAMP(3),
  ADD COLUMN "endsAt" TIMESTAMP(3),
  ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "placement" TEXT NOT NULL DEFAULT 'banner',
  ADD COLUMN "ctaLabel" TEXT,
  ADD COLUMN "ctaHref" TEXT;

CREATE INDEX "SystemAnnouncement_active_startsAt_endsAt_priority_idx"
  ON "SystemAnnouncement"("active", "startsAt", "endsAt", "priority");
