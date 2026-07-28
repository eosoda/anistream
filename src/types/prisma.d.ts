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
    $queryRaw: any;
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
  }
}
