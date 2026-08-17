import type {NextConfig} from 'next';

const configuredAssetHosts = (process.env.NEXT_PUBLIC_ASSET_HOSTS || '')
  .split(',')
  .map((host) => host.trim().toLowerCase())
  .filter((host) => /^[a-z0-9.-]+$/.test(host));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'self'; form-action 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cdn.myanimelist.net https://images.myanimelist.net https://s4.anilist.co https://media.kitsu.io https://img1.ak.crunchyroll.com ${configuredAssetHosts.map((host) => `https://${host}`).join(' ')}; media-src 'self' data: blob: https:; connect-src 'self' https: wss:; frame-src 'self' https:; worker-src 'self' blob:;`,
          },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ];
  },
  // Allow access to remote anime CDN images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.myanimelist.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.kitsu.io',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img1.ak.crunchyroll.com',
        port: '',
        pathname: '/**',
      },
      ...configuredAssetHosts.map((hostname) => ({
        protocol: 'https' as const,
        hostname,
        port: '',
        pathname: '/**',
      })),
    ],
  },
  output: 'standalone',
  webpack: (config, {dev}) => {
    // HMR is disabled in AI Studio via DISABLE_HMR env var.
    // Do not modify—file watching is disabled to prevent flickering during agent edits.
    if (dev && process.env.DISABLE_HMR === 'true') {
      config.watchOptions = {
        ignored: /.*/,
      };
    }
    return config;
  },
};

export default nextConfig;
