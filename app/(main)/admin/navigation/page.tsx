'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Compass,
  Layout,
  FileText,
  Home,
  Save,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react';
import type { HomeSectionConfig, NavItemConfig, PageFeatureConfig } from '@/types/navigation';

export default function AdminNavigationPage() {
  const [activeTab, setActiveTab] = useState<'navbar' | 'pages' | 'home'>('navbar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [navigation, setNavigation] = useState<NavItemConfig[]>([]);
  const [pages, setPages] = useState<PageFeatureConfig[]>([]);
  const [homeSections, setHomeSections] = useState<HomeSectionConfig[]>([]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/navigation');
      const json = await res.json();

      if (json?.data) {
        if (json.data.navigation) setNavigation(json.data.navigation);
        if (json.data.pages) setPages(json.data.pages);
        if (json.data.homeSections) setHomeSections(json.data.homeSections);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => void fetchSettings(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/admin/navigation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ navigation, pages, homeSections }),
      });
      const json = await res.json();
      if (res.ok) {
        setMsg('✅ Configurações de navegação salvas com sucesso!');
      } else {
        setMsg(`❌ Erro: ${json.error?.message || 'Falha ao salvar'}`);
      }
    } catch (e: any) {
      setMsg(`❌ Erro de conexão: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Handlers para reordenação e toggles
  const toggleNav = (id: string) => {
    setNavigation((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const moveNav = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= navigation.length) return;
    const newArr = [...navigation];
    const temp = newArr[index];
    newArr[index] = newArr[target];
    newArr[target] = temp;
    // Reatribuir order números
    const reordered = newArr.map((item, idx) => ({ ...item, order: idx + 1 }));
    setNavigation(reordered);
  };

  const togglePage = (id: string) => {
    setPages((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const updatePageMessage = (id: string, message: string) => {
    setPages((prev) =>
      prev.map((item) => (item.id === id ? { ...item, disabledMessage: message } : item))
    );
  };

  const toggleHomeSection = (id: string) => {
    setHomeSections((prev) =>
      prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const moveHomeSection = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= homeSections.length) return;
    const newArr = [...homeSections];
    const temp = newArr[index];
    newArr[index] = newArr[target];
    newArr[target] = temp;
    const reordered = newArr.map((item, idx) => ({ ...item, order: idx + 1 }));
    setHomeSections(reordered);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0B0F] text-white flex flex-col items-center justify-center gap-3">
        <Loader2 size={36} className="text-[#FF6B00] animate-spin" />
        <p className="text-xs font-bold text-gray-400">Carregando configurações de navegação...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0B0F] text-white p-6 sm:p-10 max-w-6xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-3xl bg-white/5 border border-white/10 glass-panel">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/dashboard"
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all mr-2"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="p-3 rounded-2xl bg-[#FF6B00]/20 text-[#FF6B00]">
            <Compass size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Customização de Navegação & Páginas</h1>
            <p className="text-xs text-gray-400">
              Gerencie menus da Navbar, mensagens de aviso de páginas desativadas e a ordem da Home
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-2xl bg-[#FF6B00] hover:bg-[#FF6B00]/80 text-white font-black text-xs flex items-center gap-2 transition-all shadow-xl shadow-[#FF6B00]/30 hover:scale-105"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          <span>Salvar Alterações</span>
        </button>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-sm font-bold flex items-center justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg(null)} className="text-xs text-gray-400 hover:text-white">
            Fechar
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('navbar')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'navbar'
              ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30'
              : 'glass-panel hover:bg-white/10 text-gray-400'
          }`}
        >
          <Layout size={16} />
          <span>Menu da Navbar ({navigation.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pages')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'pages'
              ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30'
              : 'glass-panel hover:bg-white/10 text-gray-400'
          }`}
        >
          <FileText size={16} />
          <span>Status de Páginas & Mensagens ({pages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('home')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${
            activeTab === 'home'
              ? 'bg-[#FF6B00] text-white shadow-lg shadow-[#FF6B00]/30'
              : 'glass-panel hover:bg-white/10 text-gray-400'
          }`}
        >
          <Home size={16} />
          <span>Seções da Home ({homeSections.length})</span>
        </button>
      </div>

      {/* Tab 1: Navbar Navigation Manager */}
      {activeTab === 'navbar' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Ative, desative ou altere a ordem dos links do menu principal superior da aplicação:
          </p>

          <div className="space-y-3">
            {navigation.map((item, idx) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl glass-panel border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-gray-400">
                    #{item.order}
                  </span>

                  <div>
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNavigation((prev) =>
                          prev.map((nav) => (nav.id === item.id ? { ...nav, label: val } : nav))
                        );
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-white focus:outline-none focus:border-[#FF6B00]"
                    />
                    <p className="text-[11px] text-gray-400 mt-1 font-mono">{item.href}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveNav(idx, 'up')}
                    disabled={idx === 0}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all"
                  >
                    <ArrowUp size={16} />
                  </button>

                  <button
                    onClick={() => moveNav(idx, 'down')}
                    disabled={idx === navigation.length - 1}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all"
                  >
                    <ArrowDown size={16} />
                  </button>

                  <button
                    onClick={() => toggleNav(item.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      item.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {item.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span>{item.enabled ? 'Ativo' : 'Oculto'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Pages & Custom Disabled Messages */}
      {activeTab === 'pages' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Ative ou desative páginas públicas do AniStream e defina a mensagem de aviso exibida caso o usuário acesse uma rota desativada:
          </p>

          <div className="space-y-4">
            {pages.map((page) => (
              <div key={page.id} className="p-5 rounded-2xl glass-panel border border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{page.name}</span>
                    <span className="text-xs text-gray-400 font-mono">({page.href})</span>
                  </div>

                  <button
                    onClick={() => togglePage(page.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      page.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {page.enabled ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                    <span>{page.enabled ? 'Página no Ar' : 'Página Desativada'}</span>
                  </button>
                </div>

                {!page.enabled && (
                  <div className="space-y-1.5 pt-2 border-t border-white/10">
                    <label className="text-xs text-gray-300 font-semibold flex items-center gap-1">
                      <span>Mensagem de Aviso Personalizada para o Usuário:</span>
                    </label>
                    <textarea
                      rows={2}
                      value={page.disabledMessage}
                      onChange={(e) => updatePageMessage(page.id, e.target.value)}
                      className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#FF6B00]"
                      placeholder="Digite o motivo da desativação temporária..."
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Home Sections Manager */}
      {activeTab === 'home' && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">
            Controle o que aparece na tela inicial (`/`) e altere a ordem dos carrosséis:
          </p>

          <div className="space-y-3">
            {homeSections.map((section, idx) => (
              <div
                key={section.id}
                className="p-4 rounded-2xl glass-panel border border-white/10 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xs font-black text-gray-400">
                    #{section.order}
                  </span>
                  <span className="font-bold text-sm text-white">{section.name}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => moveHomeSection(idx, 'up')}
                    disabled={idx === 0}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all"
                  >
                    <ArrowUp size={16} />
                  </button>

                  <button
                    onClick={() => moveHomeSection(idx, 'down')}
                    disabled={idx === homeSections.length - 1}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 transition-all"
                  >
                    <ArrowDown size={16} />
                  </button>

                  <button
                    onClick={() => toggleHomeSection(section.id)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${
                      section.enabled
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {section.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                    <span>{section.enabled ? 'Exibido na Home' : 'Oculto da Home'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
