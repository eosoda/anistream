import { z } from 'zod';
import type { PublicExperienceConfig } from '@/types/public-experience';

const ColorSchema = z.string().regex(/^#[0-9a-f]{3,8}$/i, 'Informe uma cor hexadecimal válida.');
const allowedAssetHosts = new Set(
  (process.env.NEXT_PUBLIC_ASSET_HOSTS || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean),
);
export const SafeAssetSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((value) => {
    if (value.startsWith('/')) return !value.startsWith('//') && !/[\s<>]/.test(value);
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password && !/[\s<>]/.test(value) && allowedAssetHosts.has(url.hostname.toLowerCase());
    } catch {
      return false;
    }
  }, 'Use um asset interno ou uma URL HTTPS sem credenciais.');

const SafeText = (max: number) => z.string().trim().max(max);

export const BrandingConfigSchema = z.object({
  appName: SafeText(80).min(1),
  brandText: SafeText(40).min(1),
  description: SafeText(240),
  logoLight: SafeAssetSchema,
  logoDark: SafeAssetSchema,
  favicon: SafeAssetSchema,
  showFooter: z.boolean(),
  showMobileBrand: z.boolean(),
});

export const ThemeConfigSchema = z.object({
  preset: z.enum(['anistream-dark', 'midnight', 'high-contrast', 'custom']),
  fontFamily: z.enum(['geist', 'system', 'mono']),
  density: z.enum(['compact', 'comfortable', 'airy']),
  accent: ColorSchema,
  accentHover: ColorSchema,
  pageBackground: ColorSchema,
  surface: ColorSchema,
  surfaceElevated: ColorSchema,
  textPrimary: ColorSchema,
  textSecondary: ColorSchema,
  border: ColorSchema,
  focus: ColorSchema,
  success: ColorSchema,
  warning: ColorSchema,
  danger: ColorSchema,
  radiusControl: z.enum(['sharp', 'rounded', 'pill']),
  radiusPanel: z.enum(['sharp', 'rounded', 'soft']),
});

export const CatalogPresentationConfigSchema = z.object({
  defaultPageSize: z.number().int().min(6).max(48),
  columns: z.object({
    mobile: z.union([z.literal(2), z.literal(3)]),
    tablet: z.union([z.literal(3), z.literal(4), z.literal(5)]),
    desktop: z.union([z.literal(4), z.literal(5), z.literal(6), z.literal(7)]),
  }),
  cardDensity: z.enum(['compact', 'comfortable', 'spacious']),
  defaultSort: z.enum(['popularity', 'score', 'title', 'year']),
  showScore: z.boolean(),
  showYear: z.boolean(),
  showType: z.boolean(),
  showStatus: z.boolean(),
  showEpisodes: z.boolean(),
  showGenres: z.boolean(),
  availableFilters: z.array(z.enum(['search', 'status', 'type', 'genre', 'year', 'score'])).max(6),
  pageHeadings: z.object({
    catalog: SafeText(100).min(1),
    popular: SafeText(100).min(1),
    seasons: SafeText(100).min(1),
    movies: SafeText(100).min(1),
    search: SafeText(100).min(1),
  }),
  placeholderImage: SafeAssetSchema,
  pinnedAnimeIds: z.array(z.number().int().positive()).max(100),
  hiddenAnimeIds: z.array(z.number().int().positive()).max(100),
});

export const PlayerDefaultsConfigSchema = z.object({
  autoplay: z.boolean(),
  defaultAudio: z.enum(['auto', 'ja', 'pt', 'en', 'es']),
  defaultSubtitle: z.enum(['auto', 'off', 'pt', 'en', 'id', 'th']),
  defaultQuality: z.enum(['auto', '360p', '480p', '720p', '1080p']),
  defaultSpeed: z.number().min(0.5).max(2).multipleOf(0.05),
  showSourcePicker: z.boolean(),
  showReport: z.boolean(),
  keyboardShortcuts: z.boolean(),
  markCompleted: z.boolean(),
  skipOpeningSeconds: z.number().int().min(0).max(600),
  skipEndingSeconds: z.number().int().min(0).max(600),
  preCacheNextEpisode: z.boolean(),
  cacheTtlSeconds: z.number().int().min(15).max(240),
  preferredExtensions: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{1,48}$/)).max(12),
});

export const FeatureFlagsConfigSchema = z.object({
  favorites: z.boolean(),
  watchHistory: z.boolean(),
  reports: z.boolean(),
  pwa: z.boolean(),
  notifications: z.boolean(),
  calendar: z.boolean(),
  advancedPlayer: z.boolean(),
  search: z.boolean(),
  seasons: z.boolean(),
  movies: z.boolean(),
  releases: z.boolean(),
  maintenanceBanner: z.boolean(),
  publicAnnouncements: z.boolean(),
  changelog: z.boolean(),
});

export const CommunicationConfigSchema = z.object({
  footerDescription: SafeText(400),
  footerCredit: SafeText(180),
  showVersionBadge: z.boolean(),
  versionLabel: SafeText(40).min(1),
});

export const PublicExperienceConfigSchema = z.object({
  schemaVersion: z.literal(1),
  branding: BrandingConfigSchema,
  theme: ThemeConfigSchema,
  catalog: CatalogPresentationConfigSchema,
  player: PlayerDefaultsConfigSchema,
  features: FeatureFlagsConfigSchema,
  communication: CommunicationConfigSchema,
});

export const PublicExperienceSaveSchema = z.object({
  expectedDraftVersion: z.number().int().min(1),
  config: PublicExperienceConfigSchema,
});

export function parsePublicExperienceConfig(value: unknown): PublicExperienceConfig {
  return PublicExperienceConfigSchema.parse(value) as PublicExperienceConfig;
}

export function validatePublicExperienceConfig(value: unknown) {
  return PublicExperienceConfigSchema.safeParse(value);
}
