export type AdminHealthState = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface AdminServiceHealth {
  id: 'database' | 'kenjitsu';
  label: string;
  status: AdminHealthState;
  checkedAt: string;
  latencyMs?: number | null;
  detail?: string | null;
}

export interface AdminExtensionHealth {
  id: string;
  name: string;
  enabled: boolean;
  nsfw: boolean;
  status: AdminHealthState;
  latencyMs?: number | null;
  lastTestedAt?: string | null;
  lastError?: string | null;
  source?: string | null;
  capabilities?: string[];
}

export interface AdminAlert {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  animeTitle: string;
  episodeNumber?: number | null;
  description?: string | null;
}

export interface AdminAuditEntry {
  id: string;
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  summary: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface AdminOverview {
  generatedAt: string;
  kpis: {
    animeCount: number;
    episodeCount: number;
    totalExtensionsCount: number;
    enabledExtensionsCount: number;
    pendingAlertsCount: number;
    overallHealthScore: number;
  };
  services: AdminServiceHealth[];
  extensions: AdminExtensionHealth[];
  alerts: AdminAlert[];
  activity: AdminAuditEntry[];
}

export interface AdminBulkResult {
  id: string;
  status: 'succeeded' | 'failed' | 'skipped';
  message?: string;
}

export interface AdminBulkResponse {
  results: AdminBulkResult[];
  summary: {
    requested: number;
    succeeded: number;
    failed: number;
    skipped: number;
  };
}

export interface AdminAnimeFilters {
  q?: string;
  status?: string;
  hasEpisodes?: 'all' | 'yes' | 'no';
  sort?: 'title' | 'updatedAt' | 'episodeCount';
  page?: number;
  pageSize?: number;
}

export interface AdminExtensionFilters {
  enabled?: 'all' | 'yes' | 'no';
  nsfw?: 'all' | 'yes' | 'no';
  status?: AdminHealthState | 'all';
  source?: string;
  capability?: string;
}
