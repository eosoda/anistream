CREATE TABLE "PublicExperienceConfig" (
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

    CONSTRAINT "PublicExperienceConfig_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublicExperienceSnapshot" (
    "id" TEXT NOT NULL,
    "configKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "label" TEXT NOT NULL,
    "documentJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "PublicExperienceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EditorialCollection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "publishedFrom" TIMESTAMP(3),
    "publishedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorialCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EditorialCollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "anilistId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorialCollectionItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PublicExperienceConfig_key_key" ON "PublicExperienceConfig"("key");
CREATE INDEX "PublicExperienceConfig_publishedAt_idx" ON "PublicExperienceConfig"("publishedAt");
CREATE UNIQUE INDEX "PublicExperienceSnapshot_configKey_version_kind_key" ON "PublicExperienceSnapshot"("configKey", "version", "kind");
CREATE INDEX "PublicExperienceSnapshot_configKey_createdAt_idx" ON "PublicExperienceSnapshot"("configKey", "createdAt");
CREATE UNIQUE INDEX "EditorialCollection_slug_key" ON "EditorialCollection"("slug");
CREATE UNIQUE INDEX "EditorialCollectionItem_collectionId_anilistId_key" ON "EditorialCollectionItem"("collectionId", "anilistId");
CREATE INDEX "EditorialCollectionItem_collectionId_order_idx" ON "EditorialCollectionItem"("collectionId", "order");

ALTER TABLE "PublicExperienceSnapshot" ADD CONSTRAINT "PublicExperienceSnapshot_configKey_fkey" FOREIGN KEY ("configKey") REFERENCES "PublicExperienceConfig"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EditorialCollectionItem" ADD CONSTRAINT "EditorialCollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "EditorialCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
