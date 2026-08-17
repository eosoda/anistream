import { NextRequest, NextResponse } from 'next/server';
import { runNextWarmTask } from '@/lib/streams/cache-warm';

export async function POST(request: NextRequest) {
  const configuredToken = process.env.CACHE_WARM_WORKER_TOKEN;
  const suppliedToken = request.headers.get('x-cache-worker-token');
  if (!configuredToken || !suppliedToken || suppliedToken !== configuredToken) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  try {
    const result = await runNextWarmTask();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[Playback Cache Worker Error]', error);
    return NextResponse.json({ error: 'Falha ao processar aquecimento.' }, { status: 500 });
  }
}
