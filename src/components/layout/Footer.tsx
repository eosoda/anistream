import React from 'react';
import Link from 'next/link';
import { Play, Heart, ExternalLink, ShieldCheck } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full bg-[#07070A] border-t border-white/10 mt-16 md:mt-20 text-gray-400 mb-16 lg:mb-0">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Brand */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white">
                <Play size={16} className="fill-current ml-0.5" />
              </div>
              <span className="font-black text-xl tracking-wider text-white">
                ANI<span className="text-[#FF6B00]">STREAM</span>
              </span>
            </Link>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              Plataforma moderna de exploração, catálogo e streaming de animes com suporte offline PWA,
              assistente de instalação e atalhos avançados de player.
            </p>
            <div className="text-xs text-gray-500 pt-2 flex items-center gap-1">
              Desenvolvido com <Heart size={12} className="text-[#FF6B00] fill-current" /> para a comunidade otaku.
            </div>
          </div>

          {/* Column 2: Navigation */}
          <div>
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Navegação
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
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
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Fontes & Administração
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
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
              <li className="pt-2">
                <Link
                  href="/admin/login"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all"
                >
                  <ShieldCheck size={14} className="text-[#FF6B00]" />
                  <span>Painel Administrativo</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>© {new Date().getFullYear()} AniStream. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4">
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-gray-400">
              Versão 2.0.0 (PWA + HLS Player + Admin CRUD)
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
