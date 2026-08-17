import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { verifyAdminAuth } from '@/lib/security/admin-auth';
import { recordAdminAudit } from '@/lib/admin/audit';
import { readJsonBodyLimited, InvalidJsonBodyError, RequestBodyTooLargeError } from '@/lib/security/body-limit';
import { toPlainText } from '@/utils/formatters';
import { PublicExperienceConfigSchema } from '@/schemas/public-experience';
import { EditorialCollectionCreateSchema } from '@/schemas/editorial-collection';

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function stringValue(record: JsonRecord, key: string, fallback = ''): string {
  return typeof record[key] === 'string' ? (record[key] as string) : fallback;
}

function optionalString(record: JsonRecord, key: string): string | null {
  return typeof record[key] === 'string' ? (record[key] as string) : null;
}

function optionalPlainText(record: JsonRecord, key: string): string | null {
  return toPlainText(optionalString(record, key));
}

function numberValue(record: JsonRecord, key: string, fallback = 0): number {
  return typeof record[key] === 'number' && Number.isFinite(record[key]) ? (record[key] as number) : fallback;
}

function optionalNumber(record: JsonRecord, key: string): number | null {
  return typeof record[key] === 'number' && Number.isFinite(record[key]) ? (record[key] as number) : null;
}

function booleanValue(record: JsonRecord, key: string, fallback: boolean): boolean {
  return typeof record[key] === 'boolean' ? (record[key] as boolean) : fallback;
}

function optionalDate(record: JsonRecord, key: string): Date | null {
  const value = record[key];
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function bigintValue(record: JsonRecord, key: string): bigint {
  const value = record[key];
  try {
    return BigInt(typeof value === 'string' || typeof value === 'number' ? value : 0);
  } catch {
    return BigInt(0);
  }
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function arrayValue(record: JsonRecord, key: string): unknown[] {
  return Array.isArray(record[key]) ? (record[key] as unknown[]) : [];
}

function isSensitiveSettingKey(key: string): boolean {
  return /password|secret|token|credential|private|api[_-]?key/i.test(key);
}

async function importBackup(data: JsonRecord): Promise<{ importedAnimes: number; importedEpisodes: number }> {
  const animeRows = arrayValue(data, 'animes').slice(0, 10000).map(asRecord);
  const announcements = arrayValue(data, 'announcements').slice(0, 1000).map(asRecord);
  const releases = arrayValue(data, 'releases').slice(0, 1000).map(asRecord);
  const settings = arrayValue(data, 'settings').slice(0, 1000).map(asRecord);
  const homepage = asRecord(data.homepage);
  const homepageLayouts = arrayValue(homepage, 'layouts').slice(0, 100).map(asRecord);
  const homepageSnapshots = arrayValue(homepage, 'snapshots').slice(0, 500).map(asRecord);
  const experience = asRecord(data.experience);
  const experienceConfigs = arrayValue(experience, 'configs').slice(0, 10).map(asRecord);
  const experienceSnapshots = arrayValue(experience, 'snapshots').slice(0, 500).map(asRecord);
  const collections = arrayValue(data, 'collections').slice(0, 500).map(asRecord);
  const providerData = asRecord(data.providers);
  const mediaProviders = (Array.isArray(data.providers) ? data.providers : arrayValue(providerData, 'mediaProviders')).slice(0, 1000).map(asRecord);
  const queues = arrayValue(data, 'autoIndexerQueue').slice(0, 5000).map(asRecord);

  let importedAnimes = 0;
  let importedEpisodes = 0;

  await prisma.$transaction(async (tx) => {
    for (const animeData of animeRows) {
      const title = stringValue(animeData, 'title', 'Anime sem título').slice(0, 300);
      const slug = stringValue(animeData, 'slug', `anime-${stringValue(animeData, 'id', Date.now().toString())}`).slice(0, 300);
      const anime = await tx.anime.upsert({
        where: { slug },
        update: {
          title,
          normalizedTitle: stringValue(animeData, 'normalizedTitle', title.toLowerCase()),
          originalTitle: optionalString(animeData, 'originalTitle'),
          description: optionalPlainText(animeData, 'description'),
          synopsis: optionalPlainText(animeData, 'synopsis') || optionalPlainText(animeData, 'description'),
          posterUrl: optionalString(animeData, 'posterUrl'),
          backdropUrl: optionalString(animeData, 'backdropUrl'),
          rating: optionalNumber(animeData, 'rating'),
          year: optionalNumber(animeData, 'year'),
          releaseYear: optionalNumber(animeData, 'releaseYear'),
          status: optionalString(animeData, 'status'),
          genres: optionalString(animeData, 'genres'),
          openingStartSeconds: optionalNumber(animeData, 'openingStartSeconds'),
          openingEndSeconds: optionalNumber(animeData, 'openingEndSeconds'),
        },
        create: {
          ...(optionalString(animeData, 'id') ? { id: stringValue(animeData, 'id') } : {}),
          title,
          normalizedTitle: stringValue(animeData, 'normalizedTitle', title.toLowerCase()),
          originalTitle: optionalString(animeData, 'originalTitle'),
          slug,
          description: optionalPlainText(animeData, 'description'),
          synopsis: optionalPlainText(animeData, 'synopsis') || optionalPlainText(animeData, 'description'),
          posterUrl: optionalString(animeData, 'posterUrl'),
          backdropUrl: optionalString(animeData, 'backdropUrl'),
          rating: optionalNumber(animeData, 'rating'),
          year: optionalNumber(animeData, 'year'),
          releaseYear: optionalNumber(animeData, 'releaseYear'),
          status: optionalString(animeData, 'status'),
          genres: optionalString(animeData, 'genres'),
          openingStartSeconds: optionalNumber(animeData, 'openingStartSeconds'),
          openingEndSeconds: optionalNumber(animeData, 'openingEndSeconds'),
          ...(optionalDate(animeData, 'createdAt') ? { createdAt: optionalDate(animeData, 'createdAt')! } : {}),
        },
      });
      importedAnimes++;

      await tx.animeAlias.deleteMany({ where: { animeId: anime.id } });
      for (const aliasData of arrayValue(animeData, 'aliases').slice(0, 200).map(asRecord)) {
        const value = stringValue(aliasData, 'value').trim();
        if (!value) continue;
        await tx.animeAlias.create({
          data: {
            ...(optionalString(aliasData, 'id') ? { id: stringValue(aliasData, 'id') } : {}),
            animeId: anime.id,
            value,
            normalizedValue: stringValue(aliasData, 'normalizedValue', value.toLowerCase()),
          },
        });
      }

      await tx.animeIdentifier.deleteMany({ where: { animeId: anime.id } });
      for (const identifierData of arrayValue(animeData, 'identifiers').slice(0, 200).map(asRecord)) {
        const provider = stringValue(identifierData, 'provider').trim();
        const value = stringValue(identifierData, 'value').trim();
        if (!provider || !value) continue;
        await tx.animeIdentifier.upsert({
          where: { provider_value: { provider, value } },
          update: { animeId: anime.id },
          create: {
            ...(optionalString(identifierData, 'id') ? { id: stringValue(identifierData, 'id') } : {}),
            animeId: anime.id,
            provider,
            value,
          },
        });
      }

      const scheduleData = asRecord(animeData.releaseScheduleRule);
      if (Object.keys(scheduleData).length > 0) {
        await tx.releaseScheduleRule.upsert({
          where: { animeId: anime.id },
          update: {
            mode: stringValue(scheduleData, 'mode', 'ADD'),
            weekday: optionalNumber(scheduleData, 'weekday'),
            timeMinutes: optionalNumber(scheduleData, 'timeMinutes'),
            timezone: stringValue(scheduleData, 'timezone', 'Asia/Tokyo'),
            enabled: booleanValue(scheduleData, 'enabled', true),
          },
          create: {
            ...(optionalString(scheduleData, 'id') ? { id: stringValue(scheduleData, 'id') } : {}),
            animeId: anime.id,
            mode: stringValue(scheduleData, 'mode', 'ADD'),
            weekday: optionalNumber(scheduleData, 'weekday'),
            timeMinutes: optionalNumber(scheduleData, 'timeMinutes'),
            timezone: stringValue(scheduleData, 'timezone', 'Asia/Tokyo'),
            enabled: booleanValue(scheduleData, 'enabled', true),
          },
        });
      }

      for (const exceptionData of arrayValue(animeData, 'releaseScheduleExceptions').slice(0, 500).map(asRecord)) {
        const dateKey = stringValue(exceptionData, 'dateKey').trim();
        if (!dateKey) continue;
        await tx.releaseScheduleException.upsert({
          where: { animeId_dateKey: { animeId: anime.id, dateKey } },
          update: {
            mode: stringValue(exceptionData, 'mode', 'MOVE'),
            weekday: optionalNumber(exceptionData, 'weekday'),
            timeMinutes: optionalNumber(exceptionData, 'timeMinutes'),
            timezone: stringValue(exceptionData, 'timezone', 'Asia/Tokyo'),
            enabled: booleanValue(exceptionData, 'enabled', true),
          },
          create: {
            ...(optionalString(exceptionData, 'id') ? { id: stringValue(exceptionData, 'id') } : {}),
            animeId: anime.id,
            dateKey,
            mode: stringValue(exceptionData, 'mode', 'MOVE'),
            weekday: optionalNumber(exceptionData, 'weekday'),
            timeMinutes: optionalNumber(exceptionData, 'timeMinutes'),
            timezone: stringValue(exceptionData, 'timezone', 'Asia/Tokyo'),
            enabled: booleanValue(exceptionData, 'enabled', true),
          },
        });
      }

      for (const episodeData of arrayValue(animeData, 'episodes').slice(0, 10000).map(asRecord)) {
        const season = Math.max(1, Math.trunc(numberValue(episodeData, 'season', 1)));
        const number = numberValue(episodeData, 'number', 1);
        const episode = await tx.episode.upsert({
          where: {
            animeId_season_number: { animeId: anime.id, season, number },
          },
          update: {
            title: optionalString(episodeData, 'title'),
            description: optionalPlainText(episodeData, 'description'),
            overview: optionalString(episodeData, 'overview'),
            thumbnailUrl: optionalString(episodeData, 'thumbnailUrl'),
            durationSeconds: optionalNumber(episodeData, 'durationSeconds'),
            openingStartSeconds: optionalNumber(episodeData, 'openingStartSeconds'),
            openingEndSeconds: optionalNumber(episodeData, 'openingEndSeconds'),
            airedAt: optionalDate(episodeData, 'airedAt'),
            publishedAt: optionalDate(episodeData, 'publishedAt'),
          },
          create: {
            ...(optionalString(episodeData, 'id') ? { id: stringValue(episodeData, 'id') } : {}),
            animeId: anime.id,
            season,
            number,
            title: optionalString(episodeData, 'title'),
            description: optionalPlainText(episodeData, 'description'),
            overview: optionalString(episodeData, 'overview'),
            thumbnailUrl: optionalString(episodeData, 'thumbnailUrl'),
            durationSeconds: optionalNumber(episodeData, 'durationSeconds'),
            openingStartSeconds: optionalNumber(episodeData, 'openingStartSeconds'),
            openingEndSeconds: optionalNumber(episodeData, 'openingEndSeconds'),
            airedAt: optionalDate(episodeData, 'airedAt'),
            publishedAt: optionalDate(episodeData, 'publishedAt'),
          },
        });
        importedEpisodes++;

        await tx.episodeSource.deleteMany({ where: { episodeId: episode.id } });
        for (const sourceData of arrayValue(episodeData, 'sources').slice(0, 100).map(asRecord)) {
          const urlEncrypted = stringValue(sourceData, 'urlEncrypted');
          if (!urlEncrypted) continue;
          await tx.episodeSource.create({
            data: {
              ...(optionalString(sourceData, 'id') ? { id: stringValue(sourceData, 'id') } : {}),
              episodeId: episode.id,
              provider: stringValue(sourceData, 'provider', 'unknown'),
              urlEncrypted,
              type: stringValue(sourceData, 'type', 'embed'),
              quality: optionalString(sourceData, 'quality'),
              width: optionalNumber(sourceData, 'width'),
              height: optionalNumber(sourceData, 'height'),
              bitrate: optionalNumber(sourceData, 'bitrate'),
              audioLanguage: stringValue(sourceData, 'audioLanguage', 'ja'),
              headersEncrypted: optionalString(sourceData, 'headersEncrypted'),
              requiresProxy: booleanValue(sourceData, 'requiresProxy', false),
              priority: numberValue(sourceData, 'priority'),
              enabled: booleanValue(sourceData, 'enabled', true),
              expiresAt: optionalDate(sourceData, 'expiresAt'),
              lastCheckedAt: optionalDate(sourceData, 'lastCheckedAt'),
              lastStatus: optionalNumber(sourceData, 'lastStatus'),
              lastLatencyMs: optionalNumber(sourceData, 'lastLatencyMs'),
              failureCount: numberValue(sourceData, 'failureCount'),
              trafficBytes: bigintValue(sourceData, 'trafficBytes'),
              subtitles: {
                create: arrayValue(sourceData, 'subtitles')
                  .slice(0, 100)
                  .map(asRecord)
                  .map((subtitleData) => ({
                    ...(optionalString(subtitleData, 'id') ? { id: stringValue(subtitleData, 'id') } : {}),
                    language: stringValue(subtitleData, 'language', 'pt-BR'),
                    label: stringValue(subtitleData, 'label', stringValue(subtitleData, 'language', 'Legenda')),
                    format: stringValue(subtitleData, 'format', 'vtt'),
                    urlEncrypted: stringValue(subtitleData, 'urlEncrypted'),
                  }))
                  .filter((subtitle) => subtitle.urlEncrypted),
              },
            },
          });
        }

        await tx.episodeReport.deleteMany({ where: { episodeId: episode.id } });
        for (const reportData of arrayValue(episodeData, 'reports').slice(0, 100).map(asRecord)) {
          await tx.episodeReport.create({
            data: {
              ...(optionalString(reportData, 'id') ? { id: stringValue(reportData, 'id') } : {}),
              episodeId: episode.id,
              type: stringValue(reportData, 'type', 'OTHER'),
              description: optionalPlainText(reportData, 'description'),
              status: stringValue(reportData, 'status', 'PENDING'),
            },
          });
        }
      }
    }

    for (const item of announcements) {
      const id = stringValue(item, 'id');
      if (!id) continue;
      await tx.systemAnnouncement.upsert({
        where: { id },
        update: {
          title: stringValue(item, 'title'),
          content: stringValue(item, 'content'),
          type: stringValue(item, 'type', 'INFO'),
          active: booleanValue(item, 'active', true),
          targetGroup: optionalString(item, 'targetGroup'),
          startsAt: optionalDate(item, 'startsAt'),
          endsAt: optionalDate(item, 'endsAt'),
          priority: numberValue(item, 'priority'),
          placement: stringValue(item, 'placement', 'banner'),
          ctaLabel: optionalString(item, 'ctaLabel'),
          ctaHref: optionalString(item, 'ctaHref'),
        },
        create: {
          id,
          title: stringValue(item, 'title'),
          content: stringValue(item, 'content'),
          type: stringValue(item, 'type', 'INFO'),
          active: booleanValue(item, 'active', true),
          targetGroup: optionalString(item, 'targetGroup'),
          startsAt: optionalDate(item, 'startsAt'),
          endsAt: optionalDate(item, 'endsAt'),
          priority: numberValue(item, 'priority'),
          placement: stringValue(item, 'placement', 'banner'),
          ctaLabel: optionalString(item, 'ctaLabel'),
          ctaHref: optionalString(item, 'ctaHref'),
        },
      });
    }

    for (const item of releases) {
      const id = stringValue(item, 'id');
      if (!id) continue;
      await tx.changelogRelease.upsert({
        where: { id },
        update: {
          version: stringValue(item, 'version'),
          title: stringValue(item, 'title'),
          content: stringValue(item, 'content'),
          type: stringValue(item, 'type', 'FEATURE'),
          releasedAt: optionalDate(item, 'releasedAt') || new Date(),
        },
        create: {
          id,
          version: stringValue(item, 'version'),
          title: stringValue(item, 'title'),
          content: stringValue(item, 'content'),
          type: stringValue(item, 'type', 'FEATURE'),
          releasedAt: optionalDate(item, 'releasedAt') || new Date(),
        },
      });
    }

    for (const item of settings) {
      const key = stringValue(item, 'key').trim();
      if (!key || isSensitiveSettingKey(key)) continue;
      await tx.systemSetting.upsert({
        where: { key },
        update: { value: stringValue(item, 'value') },
        create: { key, value: stringValue(item, 'value') },
      });
    }

    for (const item of homepageLayouts) {
      const key = stringValue(item, 'key', 'main');
      const draftJson = jsonValue(item.draftJson || {});
      const publishedJson = jsonValue(item.publishedJson || {});
      await tx.homepageLayout.upsert({
        where: { key },
        update: {
          draftJson,
          publishedJson,
          draftVersion: Math.max(1, Math.trunc(numberValue(item, 'draftVersion', 1))),
          publishedVersion: Math.max(1, Math.trunc(numberValue(item, 'publishedVersion', 1))),
          publishedAt: optionalDate(item, 'publishedAt') || new Date(),
          draftUpdatedBy: null,
          publishedBy: null,
        },
        create: {
          ...(optionalString(item, 'id') ? { id: stringValue(item, 'id') } : {}),
          key,
          draftJson,
          publishedJson,
          draftVersion: Math.max(1, Math.trunc(numberValue(item, 'draftVersion', 1))),
          publishedVersion: Math.max(1, Math.trunc(numberValue(item, 'publishedVersion', 1))),
          publishedAt: optionalDate(item, 'publishedAt') || new Date(),
          draftUpdatedBy: null,
          publishedBy: null,
        },
      });
    }

    for (const item of homepageSnapshots) {
      const layoutKey = stringValue(item, 'layoutKey', 'main');
      const version = Math.max(1, Math.trunc(numberValue(item, 'version', 1)));
      const kind = stringValue(item, 'kind', 'PUBLISHED');
      const layout = await tx.homepageLayout.findUnique({
        where: { key: layoutKey },
        select: { key: true },
      });
      if (!layout) continue;
      await tx.homepageSnapshot.upsert({
        where: { layoutKey_version_kind: { layoutKey, version, kind } },
        update: {
          label: stringValue(item, 'label', 'Snapshot importado'),
          documentJson: jsonValue(item.documentJson || {}),
          createdBy: null,
        },
        create: {
          ...(optionalString(item, 'id') ? { id: stringValue(item, 'id') } : {}),
          layoutKey,
          version,
          kind,
          label: stringValue(item, 'label', 'Snapshot importado'),
          documentJson: jsonValue(item.documentJson || {}),
          createdBy: null,
        },
      });
    }

    for (const item of experienceConfigs) {
      const key = stringValue(item, 'key', 'main');
      const draftJson = item.draftJson;
      const publishedJson = item.publishedJson;
      if (!PublicExperienceConfigSchema.safeParse(draftJson).success || !PublicExperienceConfigSchema.safeParse(publishedJson).success) continue;
      await tx.publicExperienceConfig.upsert({
        where: { key },
        update: {
          draftJson: jsonValue(draftJson),
          publishedJson: jsonValue(publishedJson),
          draftVersion: Math.max(1, Math.trunc(numberValue(item, 'draftVersion', 1))),
          publishedVersion: Math.max(1, Math.trunc(numberValue(item, 'publishedVersion', 1))),
          publishedAt: optionalDate(item, 'publishedAt') || new Date(),
          draftUpdatedBy: null,
          publishedBy: null,
        },
        create: {
          key,
          draftJson: jsonValue(draftJson),
          publishedJson: jsonValue(publishedJson),
          draftVersion: Math.max(1, Math.trunc(numberValue(item, 'draftVersion', 1))),
          publishedVersion: Math.max(1, Math.trunc(numberValue(item, 'publishedVersion', 1))),
          publishedAt: optionalDate(item, 'publishedAt') || new Date(),
          draftUpdatedBy: null,
          publishedBy: null,
        },
      });
    }

    for (const item of experienceSnapshots) {
      const configKey = stringValue(item, 'configKey', 'main');
      const version = Math.max(1, Math.trunc(numberValue(item, 'version', 1)));
      const kind = stringValue(item, 'kind', 'PUBLISHED');
      const documentJson = item.documentJson;
      if (!PublicExperienceConfigSchema.safeParse(documentJson).success) continue;
      const config = await tx.publicExperienceConfig.findUnique({
        where: { key: configKey },
        select: { key: true },
      });
      if (!config) continue;
      await tx.publicExperienceSnapshot.upsert({
        where: { configKey_version_kind: { configKey, version, kind } },
        update: {
          label: stringValue(item, 'label', 'Snapshot importado'),
          documentJson: jsonValue(documentJson),
          createdBy: null,
        },
        create: {
          configKey,
          version,
          kind,
          label: stringValue(item, 'label', 'Snapshot importado'),
          documentJson: jsonValue(documentJson),
          createdBy: null,
        },
      });
    }

    for (const item of collections) {
      const rawItems = arrayValue(item, 'items').map(asRecord);
      const parsed = EditorialCollectionCreateSchema.safeParse({
        slug: stringValue(item, 'slug'),
        title: stringValue(item, 'title'),
        description: optionalString(item, 'description'),
        coverUrl: optionalString(item, 'coverUrl'),
        active: booleanValue(item, 'active', true),
        publishedFrom: optionalString(item, 'publishedFrom'),
        publishedUntil: optionalString(item, 'publishedUntil'),
        anilistIds: rawItems.map((entry) => Math.trunc(numberValue(entry, 'anilistId'))).filter((id) => id > 0),
      });
      if (!parsed.success) continue;
      const value = parsed.data;
      const collection = await tx.editorialCollection.upsert({
        where: { slug: value.slug },
        update: {
          title: value.title,
          description: value.description ?? null,
          coverUrl: value.coverUrl ?? null,
          active: value.active,
          publishedFrom: optionalDate(item, 'publishedFrom'),
          publishedUntil: optionalDate(item, 'publishedUntil'),
        },
        create: {
          slug: value.slug,
          title: value.title,
          description: value.description ?? null,
          coverUrl: value.coverUrl ?? null,
          active: value.active,
          publishedFrom: optionalDate(item, 'publishedFrom'),
          publishedUntil: optionalDate(item, 'publishedUntil'),
        },
      });
      await tx.editorialCollectionItem.deleteMany({
        where: { collectionId: collection.id },
      });
      if (value.anilistIds.length)
        await tx.editorialCollectionItem.createMany({
          data: value.anilistIds.map((anilistId, index) => ({
            collectionId: collection.id,
            anilistId,
            order: index + 1,
          })),
        });
    }

    for (const item of mediaProviders) {
      const id = stringValue(item, 'id');
      if (!id || !stringValue(item, 'url')) continue;
      await tx.mediaProvider.upsert({
        where: { id },
        update: {
          name: stringValue(item, 'name'),
          type: stringValue(item, 'type', 'M3U'),
          url: stringValue(item, 'url'),
          priority: numberValue(item, 'priority', 100),
          enabled: booleanValue(item, 'enabled', true),
          autoIndex: booleanValue(item, 'autoIndex', true),
          headersEncrypted: optionalString(item, 'headersEncrypted'),
          lastTestedAt: optionalDate(item, 'lastTestedAt'),
          lastStatus: optionalNumber(item, 'lastStatus'),
          lastLatencyMs: optionalNumber(item, 'lastLatencyMs'),
        },
        create: {
          id,
          name: stringValue(item, 'name'),
          type: stringValue(item, 'type', 'M3U'),
          url: stringValue(item, 'url'),
          priority: numberValue(item, 'priority', 100),
          enabled: booleanValue(item, 'enabled', true),
          autoIndex: booleanValue(item, 'autoIndex', true),
          headersEncrypted: optionalString(item, 'headersEncrypted'),
          lastTestedAt: optionalDate(item, 'lastTestedAt'),
          lastStatus: optionalNumber(item, 'lastStatus'),
          lastLatencyMs: optionalNumber(item, 'lastLatencyMs'),
        },
      });
    }

    for (const item of queues) {
      const id = stringValue(item, 'id');
      if (!id) continue;
      await tx.autoIndexerQueue.upsert({
        where: { id },
        update: {
          providerId: stringValue(item, 'providerId'),
          animeTitle: stringValue(item, 'animeTitle'),
          detectedEpisode: numberValue(item, 'detectedEpisode', 1),
          metadataJson: optionalString(item, 'metadataJson'),
          status: stringValue(item, 'status', 'PENDING'),
        },
        create: {
          id,
          providerId: stringValue(item, 'providerId'),
          animeTitle: stringValue(item, 'animeTitle'),
          detectedEpisode: numberValue(item, 'detectedEpisode', 1),
          metadataJson: optionalString(item, 'metadataJson'),
          status: stringValue(item, 'status', 'PENDING'),
        },
      });
    }
  });

  return { importedAnimes, importedEpisodes };
}

// Exportação JSON do painel: catálogo e configurações editáveis. Usuários,
// hashes de senha, sessões e logs administrativos nunca entram no documento.
export async function GET(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const [
      animes,
      announcements,
      releases,
      settings,
      homepageLayouts,
      homepageSnapshots,
      experienceConfigs,
      experienceSnapshots,
      collections,
      mediaProviders,
      queues,
    ] = await Promise.all([
      prisma.anime.findMany({
        include: {
          aliases: true,
          identifiers: true,
          releaseScheduleRule: true,
          releaseScheduleExceptions: true,
          episodes: {
            include: {
              reports: true,
              sources: { include: { subtitles: true } },
            },
          },
        },
      }),
      prisma.systemAnnouncement.findMany(),
      prisma.changelogRelease.findMany(),
      prisma.systemSetting.findMany(),
      prisma.homepageLayout.findMany(),
      prisma.homepageSnapshot.findMany(),
      prisma.publicExperienceConfig.findMany(),
      prisma.publicExperienceSnapshot.findMany(),
      prisma.editorialCollection.findMany({ include: { items: true } }),
      prisma.mediaProvider.findMany(),
      prisma.autoIndexerQueue.findMany(),
    ]);

    const dump = JSON.parse(
      JSON.stringify(
        {
          version: '2.0',
          exportedAt: new Date().toISOString(),
          exportType: 'catalog-and-configuration',
          data: {
            animes,
            announcements,
            releases,
            settings: settings.filter((setting) => !isSensitiveSettingKey(setting.key)),
            navigation: settings.filter((setting) => setting.key.includes('navigation')),
            homepage: {
              layouts: homepageLayouts,
              snapshots: homepageSnapshots,
            },
            experience: {
              configs: experienceConfigs,
              snapshots: experienceSnapshots,
            },
            collections,
            providers: { mediaProviders },
            autoIndexerQueue: queues,
          },
          excluded: ['admin_users', 'AdminSession', 'AdminAuditLog', 'WebhookConfig'],
        },
        (_key, value) => (typeof value === 'bigint' ? value.toString() : value),
      ),
    );

    void recordAdminAudit({
      actorId: auth.userId,
      action: 'backup.exported',
      resourceType: 'backup',
      summary: 'Exportação JSON de catálogo e configurações realizada.',
      metadata: {
        animeCount: animes.length,
        providerCount: mediaProviders.length,
      },
    });

    return new NextResponse(JSON.stringify(dump, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=anistream-catalog-${Date.now()}.json`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('[Admin Backup Export Error]', error);
    return NextResponse.json({ error: 'Não foi possível exportar o catálogo.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await verifyAdminAuth(request);
  if (!auth.authenticated) return auth.errorResponse!;

  try {
    const body = asRecord(await readJsonBodyLimited(request, 10 * 1024 * 1024));
    const data = asRecord(body.data);
    if (!Array.isArray(data.animes) || data.animes.length > 10000) {
      return NextResponse.json({ error: 'Formato de arquivo JSON de backup inválido.' }, { status: 400 });
    }

    const result = await importBackup(data);
    void recordAdminAudit({
      actorId: auth.userId,
      action: 'backup.restored',
      resourceType: 'backup',
      summary: 'Exportação JSON de catálogo e configurações restaurada.',
      metadata: result,
    });

    return NextResponse.json({
      success: true,
      message: `Catálogo restaurado com sucesso! ${result.importedAnimes} animes e ${result.importedEpisodes} episódios processados.`,
      ...result,
    });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return NextResponse.json({ error: 'Arquivo de backup excede o limite de 10 MB.' }, { status: 413 });
    if (error instanceof InvalidJsonBodyError) return NextResponse.json({ error: 'Formato de arquivo JSON de backup inválido.' }, { status: 400 });
    console.error('[Admin Backup Import Error]', error);
    return NextResponse.json({ error: 'Não foi possível restaurar o catálogo.' }, { status: 500 });
  }
}
