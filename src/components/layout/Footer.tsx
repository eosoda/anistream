import React from 'react';
import Link from 'next/link';
import { Play, Heart, ExternalLink, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-10 w-full border-t border-white/10 bg-[#07070A] text-gray-400 md:mt-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <div className="mb-8 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-8">
          {/* Column 1: Brand */}
          <div className="col-span-2 space-y-3 md:space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white">
                <Play size={16} className="fill-current ml-0.5" />
              </div>
              <span className="font-black text-xl tracking-wider text-white">
                ANI<span className="text-[#FF6B00]">STREAM</span>
              </span>
            </Link>
            <p className="max-w-md text-xs leading-5 text-gray-400">
              Plataforma moderna de exploração, catálogo e streaming de animes com suporte offline PWA,
              assistente de instalação e atalhos avançados de player.
            </p>
            <div className="flex items-center gap-1 text-xs text-gray-500 md:pt-1">
              Desenvolvido com <Heart size={12} className="text-[#FF6B00] fill-current" /> para a comunidade otaku.
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-white md:text-sm">
              Navegação
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <Link href="/" className="hover:text-[#FF6B00] transition-colors">
                  Página Inicial
                </Link>
              </li>
              <li>
                <Link href="/populares" className="hover:text-[#FF6B00] transition-colors">
                  Top Populares
                </Link>
              </li>
              <li>
                <Link href="/calendario" className="hover:text-[#FF6B00] transition-colors text-[#FF6B00]">
                  Calendário Semanal
                </Link>
              </li>
              <li>
                <Link href="/filmes" className="hover:text-[#FF6B00] transition-colors">
                  Filmes de Anime
                </Link>
              </li>
              <li>
                <Link href="/lista/importar" className="hover:text-[#FF6B00] transition-colors">
                  Importar Lista MAL
                </Link>
              </li>
              <li>
                <Link href="/favoritos" className="hover:text-[#FF6B00] transition-colors">
                  Meus Favoritos
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: API Credits & Admin */}
          <div>
            <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-white md:text-sm">
              Fontes & Administração
            </h4>
            <ul className="space-y-2 text-xs font-semibold">
              <li>
                <a
                  href="https://jikan.moe"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#FF6B00] transition-colors"
                >
                  Jikan REST API v4
                  <ExternalLink size={12} />
                </a>
              </li>
              <li>
                <a
                  href="https://anilist.co"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 hover:text-[#FF6B00] transition-colors"
                >
                  AniList GraphQL API
                  <ExternalLink size={12} />
                </a>
              </li>
              <li className="pt-1">
                <Link
                  href="/admin/login"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/5 px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-white/10"
                >
                  <ShieldCheck size={14} className="text-[#FF6B00]" />
                  <span>Painel Administrativo</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="flex flex-col items-start justify-between gap-2 border-t border-white/5 pt-5 text-[11px] text-gray-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} AniStream. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <Link
              href="/changelog"
              aria-label="Ver changelog da versão 2.2.0"
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-gray-400 transition-colors hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/10 hover:text-[#FF8A3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"
            >
              <span className="sm:hidden">Versão 2.2.0</span>
              <span className="hidden sm:inline">Versão 2.2.0 (Sistema de UI/UX acessível)</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
