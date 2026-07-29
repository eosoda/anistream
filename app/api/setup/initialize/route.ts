import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/security/password';
import { parseM3uContent } from '@/lib/streams/m3u-parser';
import { validateUrlSsrf } from '@/lib/security/ssrf';
import { encryptData } from '@/lib/security/crypto';
import { validateSetupKey, clearSetupKey } from '@/lib/security/setup-key';

export async function POST(request: NextRequest) {
  try {
    // 1. Bloquear se o sistema já tiver um administrador cadastrado
    const adminCount = await prisma.adminUser.count();
    if (adminCount > 0) {
      return NextResponse.json(
        { error: 'Acesso Negado: A aplicação já foi instalada e configurada.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { admin, m3uContent, providerName, setupKey } = body;

    const keyToValidate = setupKey || request.headers.get('x-setup-key');

    // 2. Validar Chave de Segurança de Instalação (Setup Key)
    if (!validateSetupKey(keyToValidate)) {
      return NextResponse.json(
        {
          error:
            'Acesso Negado: Chave de instalação inválida ou não fornecida. Verifique a chave gerada nos logs do servidor/container Docker.',
        },
        { status: 403 }
      );
    }

    if (!admin?.email || !admin?.password || !admin?.name) {
      return NextResponse.json(
        { error: 'Nome, E-mail e Senha do administrador são obrigatórios.' },
        { status: 400 }
      );
    }

    if (admin.password.length < 6) {
      return NextResponse.json(
        { error: 'A senha do administrador deve ter pelo menos 6 caracteres.' },
        { status: 400 }
      );
    }

    // 3. Criar Usuário Administrador Principal
    const passwordHash = await hashPassword(admin.password);
    const newAdmin = await prisma.adminUser.create({
      data: {
        email: admin.email.toLowerCase().trim(),
        name: admin.name.trim(),
        passwordHash,
      },
    });

    // Destruir chave de instalação temporária após criação bem-sucedida do admin
    clearSetupKey();

    // 4. Criar Sessão de Login e Cookie HTTP-Only
    const sessionToken = `adm_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

    await prisma.adminSession.create({
      data: {
        token: sessionToken,
        userId: newAdmin.id,
        expiresAt,
      },
    });

    // 5. Importar Playlist M3U Inicial (se fornecida)
    let m3uImportSummary = null;
    if (m3uContent && typeof m3uContent === 'string' && m3uContent.trim().length > 0) {
      const parsedItems = parseM3uContent(m3uContent);
      let importedCount = 0;

      for (const item of parsedItems) {
        const ssrf = await validateUrlSsrf(item.streamUrl);
        if (!ssrf.valid) continue;

        const animeSlug = item.normalizedTitle.replace(/\s+/g, '-');
        const anime = await prisma.anime.upsert({
          where: { slug: animeSlug },
          update: { posterUrl: item.logoUrl || undefined },
          create: {
            title: item.rawTitle,
            normalizedTitle: item.normalizedTitle,
            slug: animeSlug,
            posterUrl: item.logoUrl,
          },
        });

        const episode = await prisma.episode.upsert({
          where: {
            animeId_season_number: {
              animeId: anime.id,
              season: item.detectedSeason,
              number: item.detectedEpisode,
            },
          },
          update: {},
          create: {
            animeId: anime.id,
            season: item.detectedSeason,
            number: item.detectedEpisode,
            title: `Episódio ${item.detectedEpisode}`,
          },
        });

        const encryptedUrl = encryptData(item.streamUrl);
        const isMp4 = item.streamUrl.endsWith('.mp4');

        await prisma.episodeSource.create({
          data: {
            episodeId: episode.id,
            provider: providerName || 'authorized-m3u-setup',
            urlEncrypted: encryptedUrl,
            type: isMp4 ? 'mp4' : 'hls',
            quality: '1080p',
            audioLanguage: 'ja',
            requiresProxy: false,
            priority: 100,
            enabled: true,
          },
        });

        importedCount++;
      }

      m3uImportSummary = {
        totalParsed: parsedItems.length,
        importedCount,
      };
    }

    const response = NextResponse.json({
      success: true,
      message: 'Aplicação configurada com sucesso!',
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
      },
      m3uImportSummary,
    });

    response.cookies.set('admin_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Erro ao inicializar aplicação', message: err.message },
      { status: 500 }
    );
  }
}
