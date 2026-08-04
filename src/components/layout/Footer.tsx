'use client';

import Link from 'next/link';
import { Heart, Play, ShieldCheck } from 'lucide-react';
import { useVisiblePublicNavigation } from '@/components/navigation';

export function Footer() {
  const { items } = useVisiblePublicNavigation();

  return (
    <footer className="mt-10 w-full border-t border-white/10 bg-[#07070A] text-gray-400 md:mt-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:py-10">
        <div className="mb-8 grid grid-cols-2 gap-x-6 gap-y-8 md:grid-cols-4 md:gap-8">
          <div className="col-span-2 space-y-3 md:space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FF6B00] text-white"><Play size={16} className="ml-0.5 fill-current" /></div>
              <span className="text-xl font-black tracking-wider text-white">ANI<span className="text-[#FF6B00]">STREAM</span></span>
            </Link>
            <p className="max-w-md text-xs leading-5 text-gray-400">Plataforma moderna de exploração, catálogo e streaming de animes com suporte offline PWA, assistente de instalação e atalhos avançados de player.</p>
            <div className="flex items-center gap-1 text-xs text-gray-400 md:pt-1">Desenvolvido com <Heart size={12} className="fill-current text-[#FF6B00]" /> para a comunidade otaku.</div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-white md:text-sm">Navegação</h2>
            <ul className="space-y-2 text-xs font-semibold">
              {items.map((item) => <li key={item.id}><Link href={item.href} className="transition-colors hover:text-[#FF6B00]">{item.label}</Link></li>)}
              <li><Link href="/lista/importar" className="transition-colors hover:text-[#FF6B00]">Importar Lista</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-white md:text-sm">Operação</h2>
            <ul className="space-y-2 text-xs font-semibold">
              <li><Link href="/changelog" className="transition-colors hover:text-[#FF6B00]">Changelog</Link></li>
              <li className="pt-1"><Link href="/admin/login" className="inline-flex min-h-9 items-center gap-1.5 rounded-[10px] border border-white/10 bg-white/5 px-2.5 text-[11px] font-bold text-white transition-colors hover:bg-white/10"><ShieldCheck size={14} className="text-[#FF6B00]" /><span>Painel Administrativo</span></Link></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-2 border-t border-white/5 pt-5 text-xs text-gray-400 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} AniStream. Todos os direitos reservados.</p>
          <Link href="/changelog" aria-label="Ver changelog da versão 2.2.0" className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-gray-400 transition-colors hover:border-[#FF6B00]/50 hover:bg-[#FF6B00]/10 hover:text-[#FF8A3D] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]">Versão 2.2.0</Link>
        </div>
      </div>
    </footer>
  );
}
