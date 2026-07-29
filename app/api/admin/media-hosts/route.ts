import { NextResponse } from 'next/server';
import { env } from '@/env';
import { prisma } from '@/lib/db/prisma';
import {
  autoAuthorizeHostnames,
  getAuthorizedHosts,
  invalidateAuthorizedHostsCache,
} from '@/lib/security/allowed-hosts';

export async function GET() {
  try {
    const envHosts = Array.isArray(env.AUTHORIZED_MEDIA_HOSTS)
      ? env.AUTHORIZED_MEDIA_HOSTS.map((h: string) => h.toLowerCase().trim()).filter(Boolean)
      : [];

    const providers = await prisma.mediaProvider.findMany({
      where: { enabled: true },
      select: { url: true, name: true },
    });

    const providerHostsSet = new Set<string>();
    for (const p of providers) {
      try {
        const h = new URL(p.url).hostname.toLowerCase().trim();
        if (h) providerHostsSet.add(h);
      } catch {}
    }

    const customSetting = await prisma.systemSetting.findUnique({
      where: { key: 'AUTHORIZED_MEDIA_HOSTS' },
    });

    const manualHosts = customSetting?.value
      ? customSetting.value
          .split(',')
          .map((h: string) => h.toLowerCase().trim())
          .filter(Boolean)
      : [];

    const allHostsSet = await getAuthorizedHosts();

    return NextResponse.json({
      envHosts,
      providerHosts: Array.from(providerHostsSet),
      manualHosts,
      allHosts: Array.from(allHostsSet),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { host } = body;

    if (!host || typeof host !== 'string' || !host.trim()) {
      return NextResponse.json({ error: 'O domínio ou URL do host é obrigatório.' }, { status: 400 });
    }

    const added = await autoAuthorizeHostnames([host]);

    const customSetting = await prisma.systemSetting.findUnique({
      where: { key: 'AUTHORIZED_MEDIA_HOSTS' },
    });
    const manualHosts = customSetting?.value
      ? customSetting.value.split(',').map((h: string) => h.trim()).filter(Boolean)
      : [];

    return NextResponse.json({
      success: true,
      added,
      manualHosts,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const hostToRemove = searchParams.get('host')?.toLowerCase().trim();

    if (!hostToRemove) {
      return NextResponse.json({ error: 'O parâmetro host é obrigatório.' }, { status: 400 });
    }

    const customSetting = await prisma.systemSetting.findUnique({
      where: { key: 'AUTHORIZED_MEDIA_HOSTS' },
    });

    if (customSetting?.value) {
      const currentList = customSetting.value
        .split(',')
        .map((h: string) => h.toLowerCase().trim())
        .filter(Boolean);

      const updatedList = currentList.filter((h: string) => h !== hostToRemove);

      await prisma.systemSetting.update({
        where: { key: 'AUTHORIZED_MEDIA_HOSTS' },
        data: { value: updatedList.join(',') },
      });

      invalidateAuthorizedHostsCache();

      return NextResponse.json({
        success: true,
        manualHosts: updatedList,
      });
    }

    return NextResponse.json({ success: true, manualHosts: [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
