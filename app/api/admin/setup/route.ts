import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Endpoint legado desativado. Use o assistente seguro em /setup.' },
    { status: 410 },
  );
}
