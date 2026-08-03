import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Teste manual de URLs foi desativado. Use o painel de extensões Kenjitsu.' },
    { status: 410 },
  );
}
