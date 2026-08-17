-- Temporary playback sources live in Redis. PostgreSQL stores only operational
-- state and sanitized metrics for the cache warmer.
CREATE TABLE "EpisodeCacheState" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "audioMode" TEXT NOT NULL DEFAULT 'sub',
    "extensionIdsJson" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EpisodeCacheState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlaybackCacheWarmTask" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "total" INTEGER NOT NULL DEFAULT 0,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "optionsJson" TEXT,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlaybackCacheWarmTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EpisodeCacheState_episodeId_key" ON "EpisodeCacheState"("episodeId");
CREATE INDEX "EpisodeCacheState_status_expiresAt_idx" ON "EpisodeCacheState"("status", "expiresAt");
CREATE INDEX "EpisodeCacheState_lastSuccessAt_idx" ON "EpisodeCacheState"("lastSuccessAt");
CREATE INDEX "PlaybackCacheWarmTask_status_createdAt_idx" ON "PlaybackCacheWarmTask"("status", "createdAt");
ALTER TABLE "EpisodeCacheState" ADD CONSTRAINT "EpisodeCacheState_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
