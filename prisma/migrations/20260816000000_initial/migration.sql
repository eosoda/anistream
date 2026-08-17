-- CreateTable
CREATE TABLE "Anime" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "originalTitle" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "synopsis" TEXT,
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "rating" DOUBLE PRECISION DEFAULT 8.0,
    "year" INTEGER,
    "releaseYear" INTEGER,
    "status" TEXT,
    "genres" TEXT,
    "openingStartSeconds" DOUBLE PRECISION,
    "openingEndSeconds" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Anime_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeAlias" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "normalizedValue" TEXT NOT NULL,

    CONSTRAINT "AnimeAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnimeIdentifier" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AnimeIdentifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "season" INTEGER NOT NULL DEFAULT 1,
    "number" DOUBLE PRECISION NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "overview" TEXT,
    "thumbnailUrl" TEXT,
    "durationSeconds" INTEGER,
    "openingStartSeconds" DOUBLE PRECISION,
    "openingEndSeconds" DOUBLE PRECISION,
    "airedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeSource" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "urlEncrypted" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quality" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "bitrate" INTEGER,
    "audioLanguage" TEXT NOT NULL DEFAULT 'ja',
    "headersEncrypted" TEXT,
    "requiresProxy" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastCheckedAt" TIMESTAMP(3),
    "lastStatus" INTEGER,
    "lastLatencyMs" INTEGER,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "trafficBytes" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EpisodeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubtitleTrack" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "urlEncrypted" TEXT NOT NULL,

    CONSTRAINT "SubtitleTrack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderHealthLog" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "error" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderHealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminSession" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "summary" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemAnnouncement" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "targetGroup" TEXT DEFAULT 'all',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemAnnouncement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpisodeReport" (
    "id" TEXT NOT NULL,
    "episodeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EpisodeReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangelogRelease" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'FEATURE',
    "releasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChangelogRelease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookConfig" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseScheduleRule" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'ADD',
    "weekday" INTEGER,
    "timeMinutes" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseScheduleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseScheduleException" (
    "id" TEXT NOT NULL,
    "animeId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'MOVE',
    "weekday" INTEGER,
    "timeMinutes" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tokyo',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseScheduleException_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageLayout" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "draftJson" JSONB NOT NULL,
    "publishedJson" JSONB NOT NULL,
    "draftVersion" INTEGER NOT NULL DEFAULT 1,
    "publishedVersion" INTEGER NOT NULL DEFAULT 1,
    "draftUpdatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "draftUpdatedBy" TEXT,
    "publishedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomepageLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageSnapshot" (
    "id" TEXT NOT NULL,
    "layoutKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "label" TEXT NOT NULL,
    "documentJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "HomepageSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'M3U',
    "url" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "autoIndex" BOOLEAN NOT NULL DEFAULT true,
    "headersEncrypted" TEXT,
    "lastTestedAt" TIMESTAMP(3),
    "lastStatus" INTEGER,
    "lastLatencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutoIndexerQueue" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "animeTitle" TEXT NOT NULL,
    "detectedEpisode" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "metadataJson" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoIndexerQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Anime_slug_key" ON "Anime"("slug");

-- CreateIndex
CREATE INDEX "Anime_normalizedTitle_idx" ON "Anime"("normalizedTitle");

-- CreateIndex
CREATE INDEX "Anime_slug_idx" ON "Anime"("slug");

-- CreateIndex
CREATE INDEX "AnimeAlias_normalizedValue_idx" ON "AnimeAlias"("normalizedValue");

-- CreateIndex
CREATE INDEX "AnimeAlias_animeId_idx" ON "AnimeAlias"("animeId");

-- CreateIndex
CREATE INDEX "AnimeIdentifier_animeId_provider_idx" ON "AnimeIdentifier"("animeId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "AnimeIdentifier_provider_value_key" ON "AnimeIdentifier"("provider", "value");

-- CreateIndex
CREATE INDEX "Episode_animeId_season_idx" ON "Episode"("animeId", "season");

-- CreateIndex
CREATE INDEX "Episode_publishedAt_idx" ON "Episode"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_animeId_season_number_key" ON "Episode"("animeId", "season", "number");

-- CreateIndex
CREATE INDEX "EpisodeSource_episodeId_enabled_idx" ON "EpisodeSource"("episodeId", "enabled");

-- CreateIndex
CREATE INDEX "EpisodeSource_provider_idx" ON "EpisodeSource"("provider");

-- CreateIndex
CREATE INDEX "SubtitleTrack_sourceId_idx" ON "SubtitleTrack"("sourceId");

-- CreateIndex
CREATE INDEX "ProviderHealthLog_provider_checkedAt_idx" ON "ProviderHealthLog"("provider", "checkedAt");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminSession_token_key" ON "AdminSession"("token");

-- CreateIndex
CREATE INDEX "AdminSession_token_idx" ON "AdminSession"("token");

-- CreateIndex
CREATE INDEX "AdminSession_userId_idx" ON "AdminSession"("userId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_createdAt_idx" ON "AdminAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AdminAuditLog_resourceType_resourceId_idx" ON "AdminAuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_action_createdAt_idx" ON "AdminAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "EpisodeReport_episodeId_idx" ON "EpisodeReport"("episodeId");

-- CreateIndex
CREATE INDEX "EpisodeReport_status_idx" ON "EpisodeReport"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseScheduleRule_animeId_key" ON "ReleaseScheduleRule"("animeId");

-- CreateIndex
CREATE INDEX "ReleaseScheduleRule_weekday_enabled_idx" ON "ReleaseScheduleRule"("weekday", "enabled");

-- CreateIndex
CREATE INDEX "ReleaseScheduleException_dateKey_enabled_idx" ON "ReleaseScheduleException"("dateKey", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "ReleaseScheduleException_animeId_dateKey_key" ON "ReleaseScheduleException"("animeId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "HomepageLayout_key_key" ON "HomepageLayout"("key");

-- CreateIndex
CREATE INDEX "HomepageLayout_publishedAt_idx" ON "HomepageLayout"("publishedAt");

-- CreateIndex
CREATE INDEX "HomepageSnapshot_layoutKey_createdAt_idx" ON "HomepageSnapshot"("layoutKey", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "HomepageSnapshot_layoutKey_version_kind_key" ON "HomepageSnapshot"("layoutKey", "version", "kind");

-- CreateIndex
CREATE INDEX "MediaProvider_enabled_idx" ON "MediaProvider"("enabled");

-- CreateIndex
CREATE INDEX "MediaProvider_priority_idx" ON "MediaProvider"("priority");

-- CreateIndex
CREATE INDEX "AutoIndexerQueue_status_idx" ON "AutoIndexerQueue"("status");

-- AddForeignKey
ALTER TABLE "AnimeAlias" ADD CONSTRAINT "AnimeAlias_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnimeIdentifier" ADD CONSTRAINT "AnimeIdentifier_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeSource" ADD CONSTRAINT "EpisodeSource_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubtitleTrack" ADD CONSTRAINT "SubtitleTrack_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "EpisodeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminSession" ADD CONSTRAINT "AdminSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpisodeReport" ADD CONSTRAINT "EpisodeReport_episodeId_fkey" FOREIGN KEY ("episodeId") REFERENCES "Episode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseScheduleRule" ADD CONSTRAINT "ReleaseScheduleRule_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseScheduleException" ADD CONSTRAINT "ReleaseScheduleException_animeId_fkey" FOREIGN KEY ("animeId") REFERENCES "Anime"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomepageSnapshot" ADD CONSTRAINT "HomepageSnapshot_layoutKey_fkey" FOREIGN KEY ("layoutKey") REFERENCES "HomepageLayout"("key") ON DELETE CASCADE ON UPDATE CASCADE;
