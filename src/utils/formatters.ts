export function formatSeasonName(season: string | null | undefined): string {
  if (!season) return '—';
  const s = season.toLowerCase();
  switch (s) {
    case 'spring':
      return 'Primavera';
    case 'summer':
      return 'Verão';
    case 'fall':
    case 'autumn':
      return 'Outono';
    case 'winter':
      return 'Inverno';
    default:
      return season.charAt(0).toUpperCase() + season.slice(1);
  }
}

export function formatStatus(status: string | null | undefined): string {
  if (!status) return 'Desconhecido';
  if (status.includes('Currently Airing')) return 'Em Exibição';
  if (status.includes('Finished Airing')) return 'Concluído';
  if (status.includes('Not yet aired')) return 'Em Breve';
  return status;
}

export function formatSource(source: string | null | undefined): string {
  if (!source) return 'Original';
  switch (source.toLowerCase()) {
    case 'manga':
      return 'Mangá';
    case 'light_novel':
    case 'light novel':
      return 'Light Novel';
    case 'visual_novel':
    case 'visual novel':
      return 'Visual Novel';
    case 'original':
      return 'Original';
    case 'game':
      return 'Jogo';
    case 'web_manga':
    case 'web manga':
      return 'Web Manga';
    case 'novel':
      return 'Novel';
    default:
      return source;
  }
}

export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) return '—';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatRating(rating: string | null | undefined): string {
  if (!rating) return 'Livre';
  if (rating.includes('PG-13')) return '13+';
  if (rating.includes('R - 17+')) return '17+';
  if (rating.includes('R+')) return '18+';
  if (rating.includes('PG')) return '10+';
  if (rating.includes('G')) return 'Livre';
  return rating;
}
