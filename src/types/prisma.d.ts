declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: any);
    anime: any;
    animeAlias: any;
    animeIdentifier: any;
    episode: any;
    episodeSource: any;
    subtitleTrack: any;
    providerHealthLog: any;
    adminSession: any;
    adminUser: any;
    systemAnnouncement: any;
    episodeReport: any;
    changelogRelease: any;
    webhookConfig: any;
    systemSetting: any;
    mediaProvider: any;
    autoIndexerQueue: any;
    $queryRaw: any;
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
  }
}
