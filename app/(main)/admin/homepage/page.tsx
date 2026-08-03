'use client';

import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import {
  AlignJustify,
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Eye,
  EyeOff,
  ExternalLink,
  GripVertical,
  LayoutTemplate,
  Loader2,
  MonitorPlay,
  Plus,
  Save,
  Trash2,
  WandSparkles,
} from 'lucide-react';
import type {
  HomepageBlock,
  HomepageContentSource,
  HomepageFrame,
  HomepageLayoutDocument,
  HomepageQuerySource,
  HomepageAdminState,
} from '@/types/homepage';
import { HomepageDraftPreview } from '@/components/home/HomepageDraftPreview';
import { AdminFeedback, AdminPageHeader, AdminPanel, AdminSaveBar, AdminStatusBadge } from '@/components/admin';
import { useConfirmation } from '@/context/ConfirmationContext';

const BLOCK_OPTIONS: Array<{ type: HomepageBlock['type']; label: string; description: string }> = [
  { type: 'hero', label: 'Hero de destaques', description: 'Destaque Kenjitsu em até cinco slides.' },
  { type: 'catalog_carousel', label: 'Carrossel de catálogo', description: 'Consulta ou coleção manual de animes.' },
  { type: 'continue_watching', label: 'Continuar assistindo', description: 'Progresso salvo neste navegador.' },
  { type: 'quick_filters', label: 'Filtros rápidos', description: 'Atalhos para a pesquisa do catálogo.' },
  { type: 'editorial_notice', label: 'Aviso editorial', description: 'Texto simples com CTA interno.' },
  { type: 'divider', label: 'Separador', description: 'Divisão visual entre grupos.' },
];

const DEFAULT_FRAME: HomepageFrame = { width: 'content', variant: 'default', spacing: 'normal' };
const QUERY_SOURCE_DEFAULT: HomepageQuerySource = { mode: 'query', source: 'top', category: 'popular' };

function newId(type: HomepageBlock['type']) {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : String(Date.now());
  return `homepage-${type}-${suffix}`;
}

function createBlock(type: HomepageBlock['type'], order: number): HomepageBlock {
  const common = { id: newId(type), enabled: true, order, frame: { ...DEFAULT_FRAME } };
  if (type === 'hero') return { ...common, type, frame: { ...DEFAULT_FRAME, width: 'full', variant: 'featured' }, source: { ...QUERY_SOURCE_DEFAULT, category: 'trending' }, slideLimit: 5, autoplay: 'standard' };
  if (type === 'catalog_carousel') return { ...common, type, source: QUERY_SOURCE_DEFAULT, title: 'Nova seção', subtitle: 'Conteúdo selecionado pelo Kenjitsu.', limit: 8, ctaHref: '/populares', ctaLabel: 'Ver todos' };
  if (type === 'continue_watching') return { ...common, type, title: 'Continuar Assistindo' };
  if (type === 'quick_filters') return { ...common, type, title: 'Explore por filtro', frame: { ...DEFAULT_FRAME, spacing: 'compact' } };
  if (type === 'editorial_notice') return { ...common, type, title: 'Aviso', body: 'Escreva uma mensagem para quem visita a Home.', variant: 'info', active: true };
  return { ...common, type, label: 'Mais para explorar' };
}

function blockLabel(block: HomepageBlock) {
  if (block.type === 'hero') return block.titleOverride || 'Hero de destaques';
  if (block.type === 'catalog_carousel') return block.title;
  if (block.type === 'continue_watching') return block.title || 'Continuar Assistindo';
  if (block.type === 'quick_filters') return block.title || 'Filtros rápidos';
  if (block.type === 'editorial_notice') return block.title;
  return block.label || 'Separador';
}

function blockDescription(block: HomepageBlock) {
  if (block.type === 'hero' || block.type === 'catalog_carousel') return block.source.mode === 'manual' ? 'Coleção manual Kenjitsu' : `Consulta ${block.source.source} do Kenjitsu`;
  if (block.type === 'continue_watching') return 'Estado pessoal do navegador';
  if (block.type === 'quick_filters') return 'Navega para a pesquisa';
  if (block.type === 'editorial_notice') return block.active ? 'Publicado quando o layout for publicado' : 'Desativado';
  return 'Divisão visual';
}

function SortableHomepageBlock({
  block,
  selected,
  onSelect,
  onToggle,
  onDuplicate,
  onRemove,
}: {
  block: HomepageBlock;
  selected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`group flex items-stretch gap-2 border bg-[var(--admin-surface)] p-2 transition-colors ${selected ? 'border-[#FF6B00]' : 'border-[var(--admin-line)]'} ${isDragging ? 'z-10 opacity-70 shadow-2xl' : ''}`}>
      <button type="button" className="grid min-h-16 w-10 shrink-0 place-items-center border border-[var(--admin-line)] text-[var(--admin-dim)] hover:text-[var(--admin-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]" aria-label={`Arrastar ${blockLabel(block)}`} {...attributes} {...listeners}>
        <GripVertical size={18} aria-hidden="true" />
      </button>
      <button type="button" onClick={onSelect} className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--admin-surface)]">
        <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--admin-dim)]"><span>{String(block.order).padStart(2, '0')}</span><span>{block.type}</span></span>
        <span className="mt-1 block truncate text-sm font-bold text-[var(--admin-text)]">{blockLabel(block)}</span>
        <span className="mt-1 block truncate text-xs text-[var(--admin-dim)]">{blockDescription(block)}</span>
      </button>
      <div className="flex shrink-0 flex-col items-center justify-center gap-1 sm:flex-row">
        <button type="button" onClick={onToggle} className="admin-icon-button" aria-label={block.enabled ? `Ocultar ${blockLabel(block)}` : `Exibir ${blockLabel(block)}`} title={block.enabled ? 'Ocultar' : 'Exibir'}>
          {block.enabled ? <Eye size={15} /> : <EyeOff size={15} />}
        </button>
        <button type="button" onClick={onDuplicate} className="admin-icon-button" aria-label={`Duplicar ${blockLabel(block)}`} title="Duplicar"><Copy size={15} /></button>
        <button type="button" onClick={onRemove} className="admin-icon-button text-rose-300 hover:border-rose-400/50 hover:text-rose-200" aria-label={`Remover ${blockLabel(block)}`} title="Remover"><Trash2 size={15} /></button>
      </div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="admin-field-group"><span className="admin-field-label">{label}</span>{children}{hint && <span className="text-[11px] text-[var(--admin-dim)]">{hint}</span>}</label>;
}

function SourceEditor({ source, onChange }: { source: HomepageContentSource; onChange: (source: HomepageContentSource) => void }) {
  const query = source.mode === 'query' ? source : null;
  const filters = query?.filters || {};

  const updateQuery = (patch: Partial<HomepageQuerySource>) => {
    onChange({ ...(query || QUERY_SOURCE_DEFAULT), ...patch, mode: 'query' });
  };

  return (
    <div className="space-y-3 border-t border-[var(--admin-line)] pt-4">
      <Field label="Modo de fonte">
        <select className="admin-field" value={source.mode} onChange={(event) => onChange(event.target.value === 'manual' ? { mode: 'manual', anilistIds: ['52991'] } : QUERY_SOURCE_DEFAULT)}>
          <option value="query">Consulta Kenjitsu</option>
          <option value="manual">IDs manuais Kenjitsu</option>
        </select>
      </Field>

      {source.mode === 'manual' ? (
        <Field label="anilistIds" hint="Um ID por linha ou separado por vírgula. Dados resolvidos sempre pelo Kenjitsu.">
          <textarea className="admin-field min-h-28 resize-y font-mono text-xs" value={source.anilistIds.join('\n')} onChange={(event) => onChange({ mode: 'manual', anilistIds: event.target.value.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean).slice(0, 12) })} />
        </Field>
      ) : (
        <>
          <Field label="Tipo de consulta">
            <select className="admin-field" value={source.source} onChange={(event) => updateQuery({ source: event.target.value as HomepageQuerySource['source'], category: event.target.value === 'top' ? 'popular' : undefined, year: event.target.value === 'season' ? new Date().getFullYear() : undefined, season: event.target.value === 'season' ? 'summer' : undefined, filters: event.target.value === 'catalog' ? {} : undefined })}>
              <option value="top">Ranking Kenjitsu</option>
              <option value="season">Temporada por ano</option>
              <option value="catalog">Catálogo com filtros</option>
            </select>
          </Field>
          {source.source === 'top' && <Field label="Categoria"><select className="admin-field" value={source.category || 'popular'} onChange={(event) => updateQuery({ category: event.target.value as HomepageQuerySource['category'] })}><option value="trending">Em alta</option><option value="airing">Em exibição</option><option value="upcoming">Em breve</option><option value="popular">Populares</option><option value="rating">Mais bem avaliados</option></select></Field>}
          {source.source === 'season' && <div className="grid grid-cols-2 gap-3"><Field label="Ano"><input className="admin-field" type="number" min={1900} max={2200} value={source.year || new Date().getFullYear()} onChange={(event) => updateQuery({ year: Number(event.target.value) })} /></Field><Field label="Estação"><select className="admin-field" value={source.season || 'summer'} onChange={(event) => updateQuery({ season: event.target.value as HomepageQuerySource['season'] })}><option value="winter">Inverno</option><option value="spring">Primavera</option><option value="summer">Verão</option><option value="fall">Outono</option></select></Field></div>}
          {source.source === 'catalog' && <div className="space-y-3"><Field label="Busca opcional"><input className="admin-field" value={filters.query || ''} onChange={(event) => updateQuery({ filters: { ...filters, query: event.target.value } })} placeholder="Nome do anime" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Status"><select className="admin-field" value={filters.status || 'all'} onChange={(event) => updateQuery({ filters: { ...filters, status: event.target.value as typeof filters.status } })}><option value="all">Todos</option><option value="airing">Em exibição</option><option value="complete">Concluídos</option><option value="upcoming">Em breve</option></select></Field><Field label="Gêneros"><input className="admin-field" value={filters.genres || ''} onChange={(event) => updateQuery({ filters: { ...filters, genres: event.target.value } })} placeholder="1,10,22" /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Ordenar por"><select className="admin-field" value={filters.orderBy || 'popularity'} onChange={(event) => updateQuery({ filters: { ...filters, orderBy: event.target.value as typeof filters.orderBy } })}><option value="popularity">Popularidade</option><option value="score">Nota</option><option value="title">Título</option><option value="start_date">Data</option></select></Field><Field label="Direção"><select className="admin-field" value={filters.sort || 'desc'} onChange={(event) => updateQuery({ filters: { ...filters, sort: event.target.value as typeof filters.sort } })}><option value="desc">Descendente</option><option value="asc">Ascendente</option></select></Field></div></div>}
        </>
      )}
    </div>
  );
}

function BlockInspector({ block, onChange }: { block: HomepageBlock; onChange: (updater: (block: HomepageBlock) => HomepageBlock) => void }) {
  const update = (patch: Partial<HomepageBlock>) => onChange((current) => ({ ...current, ...patch } as HomepageBlock));
  const updateFrame = (patch: Partial<HomepageFrame>) => update({ frame: { ...block.frame, ...patch } });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Visibilidade"><select className="admin-field" value={block.enabled ? 'enabled' : 'hidden'} onChange={(event) => update({ enabled: event.target.value === 'enabled' })}><option value="enabled">Visível</option><option value="hidden">Oculto</option></select></Field>
        <Field label="Largura"><select className="admin-field" value={block.frame.width} onChange={(event) => updateFrame({ width: event.target.value as HomepageFrame['width'] })}><option value="content">Conteúdo</option><option value="wide">Ampla</option><option value="full">Tela cheia</option></select></Field>
      </div>
      <div className="grid grid-cols-2 gap-3"><Field label="Variante"><select className="admin-field" value={block.frame.variant} onChange={(event) => updateFrame({ variant: event.target.value as HomepageFrame['variant'] })}><option value="default">Padrão</option><option value="featured">Destaque</option><option value="muted">Suave</option><option value="compact">Compacta</option></select></Field><Field label="Espaçamento"><select className="admin-field" value={block.frame.spacing} onChange={(event) => updateFrame({ spacing: event.target.value as HomepageFrame['spacing'] })}><option value="compact">Compacto</option><option value="normal">Normal</option><option value="airy">Amplo</option></select></Field></div>

      {(block.type === 'hero' || block.type === 'catalog_carousel') && <SourceEditor source={block.source} onChange={(source) => update({ source })} />}

      {block.type === 'hero' && <div className="space-y-3 border-t border-[var(--admin-line)] pt-4"><div className="grid grid-cols-2 gap-3"><Field label="Slides"><input className="admin-field" type="number" min={1} max={5} value={block.slideLimit} onChange={(event) => update({ slideLimit: Math.min(5, Math.max(1, Number(event.target.value) || 1)) })} /></Field><Field label="Autoplay"><select className="admin-field" value={block.autoplay} onChange={(event) => update({ autoplay: event.target.value as typeof block.autoplay })}><option value="standard">Padrão</option><option value="slow">Lento</option><option value="off">Desligado</option></select></Field></div><Field label="Título opcional"><input className="admin-field" value={block.titleOverride || ''} onChange={(event) => update({ titleOverride: event.target.value || undefined })} placeholder="Usar título do Kenjitsu" /></Field><Field label="Texto opcional"><textarea className="admin-field min-h-20 resize-y" value={block.subtitleOverride || ''} onChange={(event) => update({ subtitleOverride: event.target.value || undefined })} placeholder="Usar sinopse do Kenjitsu" /></Field></div>}

      {block.type === 'catalog_carousel' && <div className="space-y-3 border-t border-[var(--admin-line)] pt-4"><Field label="Título"><input className="admin-field" value={block.title} onChange={(event) => update({ title: event.target.value })} /></Field><Field label="Subtítulo"><input className="admin-field" value={block.subtitle || ''} onChange={(event) => update({ subtitle: event.target.value || undefined })} /></Field><div className="grid grid-cols-2 gap-3"><Field label="Itens"><input className="admin-field" type="number" min={6} max={12} value={block.limit} onChange={(event) => update({ limit: Math.min(12, Math.max(6, Number(event.target.value) || 8)) })} /><span className="text-[11px] text-[var(--admin-dim)]">Entre 6 e 12.</span></Field><Field label="CTA"><input className="admin-field" value={block.ctaLabel || ''} onChange={(event) => update({ ctaLabel: event.target.value || undefined })} placeholder="Ver todos" /></Field></div><Field label="Rota interna do CTA"><input className="admin-field font-mono text-xs" value={block.ctaHref || ''} onChange={(event) => update({ ctaHref: event.target.value || undefined })} placeholder="/populares" /></Field></div>}
      {block.type === 'continue_watching' && <Field label="Título"><input className="admin-field" value={block.title || ''} onChange={(event) => update({ title: event.target.value || undefined })} /></Field>}
      {block.type === 'quick_filters' && <Field label="Título"><input className="admin-field" value={block.title || ''} onChange={(event) => update({ title: event.target.value || undefined })} /></Field>}
      {block.type === 'editorial_notice' && <div className="space-y-3 border-t border-[var(--admin-line)] pt-4"><Field label="Status"><select className="admin-field" value={block.active ? 'active' : 'inactive'} onChange={(event) => update({ active: event.target.value === 'active' })}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></Field><Field label="Título"><input className="admin-field" value={block.title} onChange={(event) => update({ title: event.target.value })} /></Field><Field label="Texto simples"><textarea className="admin-field min-h-28 resize-y" value={block.body} onChange={(event) => update({ body: event.target.value })} /></Field><Field label="Variante"><select className="admin-field" value={block.variant} onChange={(event) => update({ variant: event.target.value as typeof block.variant })}><option value="info">Informação</option><option value="warning">Atenção</option><option value="success">Sucesso</option></select></Field><div className="grid grid-cols-2 gap-3"><Field label="Texto do CTA"><input className="admin-field" value={block.cta?.label || ''} onChange={(event) => update({ cta: event.target.value ? { label: event.target.value, href: block.cta?.href || '/populares' } : undefined })} /></Field><Field label="Rota interna"><input className="admin-field font-mono text-xs" value={block.cta?.href || ''} onChange={(event) => update({ cta: event.target.value ? { label: block.cta?.label || 'Abrir', href: event.target.value } : undefined })} placeholder="/populares" /></Field></div></div>}
      {block.type === 'divider' && <Field label="Rótulo opcional"><input className="admin-field" value={block.label || ''} onChange={(event) => update({ label: event.target.value || undefined })} /></Field>}
    </div>
  );
}

export default function AdminHomepagePage() {
  const [state, setState] = useState<HomepageAdminState | null>(null);
  const [savedDraft, setSavedDraft] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'warning' | 'danger'; message: string } | null>(null);
  const [showAddBlock, setShowAddBlock] = useState(false);
  const { confirm } = useConfirmation();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/homepage', { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || 'Não foi possível carregar o builder.');
      setState(payload.data);
      setSavedDraft(JSON.stringify(payload.data.draft));
      setSelectedId(payload.data.draft.blocks[0]?.id || null);
    } catch (error) {
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Não foi possível carregar o builder.' });
    } finally {
      setLoading(false);
    }
  };

  // Initial hydration synchronizes the editor with the authenticated API state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const orderedBlocks = useMemo(() => state ? [...state.draft.blocks].sort((a, b) => a.order - b.order) : [], [state]);
  const selectedBlock = orderedBlocks.find((block) => block.id === selectedId) || orderedBlocks[0];
  const dirty = Boolean(state && JSON.stringify(state.draft) !== savedDraft);

  const updateDocument = (updater: (document: HomepageLayoutDocument) => HomepageLayoutDocument) => {
    setState((current) => current ? { ...current, draft: updater(current.draft) } : current);
  };

  const updateBlock = (id: string, updater: (block: HomepageBlock) => HomepageBlock) => {
    updateDocument((document) => ({ ...document, blocks: document.blocks.map((block) => block.id === id ? updater(block) : block) }));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = orderedBlocks.findIndex((block) => block.id === active.id);
    const newIndex = orderedBlocks.findIndex((block) => block.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const blocks = arrayMove(orderedBlocks, oldIndex, newIndex).map((block, index) => ({ ...block, order: index + 1 }));
    updateDocument((document) => ({ ...document, blocks }));
    setSelectedId(String(active.id));
  };

  const moveBlock = (id: string, direction: -1 | 1) => {
    const index = orderedBlocks.findIndex((block) => block.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= orderedBlocks.length) return;
    updateDocument((document) => ({ ...document, blocks: arrayMove(orderedBlocks, index, target).map((block, itemIndex) => ({ ...block, order: itemIndex + 1 })) }));
    setSelectedId(id);
  };

  const addBlock = (type: HomepageBlock['type']) => {
    if (!state || state.draft.blocks.length >= 12) return;
    const block = createBlock(type, state.draft.blocks.length + 1);
    updateDocument((document) => ({ ...document, blocks: [...document.blocks, block] }));
    setSelectedId(block.id);
    setShowAddBlock(false);
  };

  const duplicateBlock = (block: HomepageBlock) => {
    if (!state || state.draft.blocks.length >= 12) return;
    const copy = { ...structuredClone(block), id: newId(block.type) } as HomepageBlock;
    const index = orderedBlocks.findIndex((item) => item.id === block.id);
    const blocks = [...orderedBlocks];
    blocks.splice(index + 1, 0, copy);
    updateDocument((document) => ({ ...document, blocks: blocks.map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })) }));
    setSelectedId(copy.id);
  };

  const removeBlock = async (block: HomepageBlock) => {
    if (!state) return;
    const confirmed = await confirm({ title: 'Remover bloco?', description: `O bloco “${blockLabel(block)}” será removido do rascunho. A Home publicada não muda até publicar.`, confirmText: 'Remover', cancelText: 'Cancelar', variant: 'danger' });
    if (!confirmed) return;
    updateDocument((document) => ({ ...document, blocks: document.blocks.filter((item) => item.id !== block.id).map((item, index) => ({ ...item, order: index + 1 })) }));
    setSelectedId(orderedBlocks.find((item) => item.id !== block.id)?.id || null);
  };

  const handleSave = async () => {
    if (!state || saving) return;
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/admin/homepage', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedDraftVersion: state.draftVersion, document: state.draft }) });
      const payload = await response.json();
      if (!response.ok) throw Object.assign(new Error(payload.error?.message || 'Não foi possível salvar o rascunho.'), { code: payload.error?.code, status: response.status });
      setState(payload.data);
      setSavedDraft(JSON.stringify(payload.data.draft));
      setFeedback({ tone: 'success', message: 'Rascunho salvo. A Home pública continua igual até a publicação.' });
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error ? error.status : 0;
      setFeedback({ tone: status === 409 ? 'warning' : 'danger', message: error instanceof Error ? error.message : 'Não foi possível salvar o rascunho.' });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!state || saving) return;
    if (dirty) {
      setFeedback({ tone: 'warning', message: 'Salve o rascunho antes de publicar.' });
      return;
    }
    const confirmed = await confirm({ title: 'Publicar nova Home?', description: `${state.summary.visibleBlockCount} bloco(s) visível(is) serão publicados para todos os visitantes.`, confirmText: 'Publicar Home', cancelText: 'Cancelar', variant: 'primary' });
    if (!confirmed) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/homepage/publish', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedDraftVersion: state.draftVersion, expectedPublishedVersion: state.publishedVersion }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || 'Não foi possível publicar a Home.');
      setState(payload.data);
      setSavedDraft(JSON.stringify(payload.data.draft));
      setFeedback({ tone: 'success', message: 'Home publicada com sucesso.' });
    } catch (error) {
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Não foi possível publicar a Home.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardServerDraft = async () => {
    if (!state || saving) return;
    const confirmed = await confirm({ title: 'Restaurar última publicação?', description: 'Todas as alterações salvas no rascunho serão substituídas pela última Home publicada.', confirmText: 'Restaurar', cancelText: 'Cancelar', variant: 'warning' });
    if (!confirmed) return;
    setSaving(true);
    try {
      const response = await fetch('/api/admin/homepage/discard', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ expectedDraftVersion: state.draftVersion, expectedPublishedVersion: state.publishedVersion }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || 'Não foi possível restaurar o rascunho.');
      setState(payload.data);
      setSavedDraft(JSON.stringify(payload.data.draft));
      setFeedback({ tone: 'success', message: 'Rascunho restaurado para a última publicação.' });
    } catch (error) {
      setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'Não foi possível restaurar o rascunho.' });
    } finally {
      setSaving(false);
    }
  };

  const discardLocalChanges = () => {
    if (!state || !savedDraft) return;
    const draft = JSON.parse(savedDraft) as HomepageLayoutDocument;
    setState((current) => current ? { ...current, draft } : current);
    setFeedback({ tone: 'success', message: 'Alterações locais descartadas.' });
  };

  if (loading) return <div className="admin-empty-state min-h-[420px]" aria-live="polite"><Loader2 size={24} className="animate-spin text-[#FF6B00]" aria-hidden="true" /><h2>Carregando construtor da Home</h2><p>Consultando o layout publicado e o rascunho administrativo.</p></div>;
  if (!state) return <div className="admin-empty-state min-h-[420px]"><h2>Builder indisponível</h2><p>Não foi possível carregar a configuração da Home.</p><button type="button" className="admin-button is-primary" onClick={() => void load()}>Tentar novamente</button></div>;

  return (
    <div className="space-y-5 pb-28">
      <AdminPageHeader eyebrow="Gerenciar / Experiência" title="Construtor da Home" description="Componha a página inicial com blocos Kenjitsu, conteúdo editorial seguro e prévia responsiva." breadcrumbs={[{ label: 'Navegação', href: '/admin/navigation' }, { label: 'Home' }]} status={<AdminStatusBadge status="healthy" label={`Publicada v${state.publishedVersion}`} />} actions={<div className="flex flex-wrap gap-2"><Link href="/admin/navigation" className="admin-button is-ghost">Navegação</Link><button type="button" className="admin-button is-ghost" onClick={() => window.open('/preview/homepage', '_blank', 'noopener,noreferrer')}><ExternalLink size={15} /> Abrir prévia</button><button type="button" className="admin-button is-primary" onClick={() => void handlePublish()} disabled={saving || dirty}>{saving ? <Loader2 size={15} className="animate-spin" /> : <MonitorPlay size={15} />} Publicar</button></div>} />
      {feedback && <AdminFeedback tone={feedback.tone} onDismiss={() => setFeedback(null)}>{feedback.message}</AdminFeedback>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
        <div className="space-y-5">
          <AdminPanel>
            <div className="admin-panel-header"><div><p className="admin-eyebrow">Canvas operacional</p><h2 className="admin-section-title">Blocos da Home</h2><p className="admin-section-description">Arraste para reordenar ou use o teclado. A composição aceita até 12 blocos.</p></div><div className="flex items-center gap-2"><span className="font-mono text-[11px] text-[var(--admin-dim)]">{orderedBlocks.length}/12</span><button type="button" className="admin-button is-primary" onClick={() => setShowAddBlock((value) => !value)} disabled={orderedBlocks.length >= 12}><Plus size={15} /> Adicionar</button></div></div>
            {showAddBlock && <div className="mb-4 grid gap-2 border border-[#FF6B00]/30 bg-[#FF6B00]/[0.05] p-3 sm:grid-cols-2"><p className="sm:col-span-2 text-xs font-bold uppercase tracking-wider text-[#FFB27A]">Escolha um bloco tipado</p>{BLOCK_OPTIONS.map((option) => <button key={option.type} type="button" onClick={() => addBlock(option.type)} className="flex items-start gap-3 border border-[var(--admin-line)] bg-[var(--admin-surface)] p-3 text-left transition-colors hover:border-[#FF6B00]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B00]"><LayoutTemplate size={16} className="mt-0.5 shrink-0 text-[#FF6B00]" /><span><strong className="block text-xs text-[var(--admin-text)]">{option.label}</strong><small className="mt-1 block text-[11px] text-[var(--admin-dim)]">{option.description}</small></span></button>)}</div>}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={orderedBlocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2" aria-label="Blocos ordenáveis da Home">{orderedBlocks.map((block) => <SortableHomepageBlock key={block.id} block={block} selected={selectedId === block.id} onSelect={() => setSelectedId(block.id)} onToggle={() => updateBlock(block.id, (current) => ({ ...current, enabled: !current.enabled }))} onDuplicate={() => duplicateBlock(block)} onRemove={() => void removeBlock(block)} />)}</div>
              </SortableContext>
            </DndContext>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--admin-line)] pt-4 text-xs text-[var(--admin-dim)]"><AlignJustify size={14} /><span>Bloco selecionado: {selectedBlock ? blockLabel(selectedBlock) : 'nenhum'}</span>{selectedBlock && <><button type="button" className="admin-icon-button" onClick={() => moveBlock(selectedBlock.id, -1)} aria-label="Mover bloco para cima"><ArrowUp size={14} /></button><button type="button" className="admin-icon-button" onClick={() => moveBlock(selectedBlock.id, 1)} aria-label="Mover bloco para baixo"><ArrowDown size={14} /></button></>}</div>
          </AdminPanel>
          <AdminPanel><div className="admin-panel-header"><div><p className="admin-eyebrow">Prévia local</p><h2 className="admin-section-title">Composição responsiva</h2><p className="admin-section-description">Os cards exibidos aqui são fixtures visuais; a prévia em nova aba consulta o Kenjitsu real.</p></div><WandSparkles size={20} className="text-[#FF6B00]" aria-hidden="true" /></div><div className="max-h-[780px] overflow-y-auto border border-[var(--admin-line)] bg-[#0B0B0F] p-2"><HomepageDraftPreview document={state.draft} /></div></AdminPanel>
        </div>

        <AdminPanel className="h-fit xl:sticky xl:top-5"><div className="admin-panel-header"><div><p className="admin-eyebrow">Inspector</p><h2 className="admin-section-title">{selectedBlock ? blockLabel(selectedBlock) : 'Selecione um bloco'}</h2><p className="admin-section-description">Configurações tipadas e seguras para o bloco selecionado.</p></div></div>{selectedBlock ? <BlockInspector block={selectedBlock} onChange={(updater) => updateBlock(selectedBlock.id, updater)} /> : <div className="admin-empty-state"><h2>Nenhum bloco selecionado</h2><p>Escolha um bloco no canvas para editar suas propriedades.</p></div>}<div className="mt-5 border-t border-[var(--admin-line)] pt-4"><div className="flex flex-wrap gap-2"><button type="button" className="admin-button is-ghost" onClick={() => moveBlock(selectedBlock?.id || '', -1)} disabled={!selectedBlock}><ArrowUp size={14} /> Subir</button><button type="button" className="admin-button is-ghost" onClick={() => moveBlock(selectedBlock?.id || '', 1)} disabled={!selectedBlock}><ArrowDown size={14} /> Descer</button><button type="button" className="admin-button is-ghost text-rose-300" onClick={() => selectedBlock && void removeBlock(selectedBlock)} disabled={!selectedBlock}><Trash2 size={14} /> Remover</button></div></div></AdminPanel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border border-[var(--admin-line)] bg-[var(--admin-surface)] px-4 py-3 text-xs text-[var(--admin-dim)]"><span><Check size={14} className="mr-1 inline text-emerald-400" aria-hidden="true" />Última publicação: {new Date(state.publishedAt).toLocaleString('pt-BR')}</span><button type="button" className="admin-button is-ghost" onClick={() => void handleDiscardServerDraft()} disabled={saving || dirty}>Restaurar última publicação</button></div>
      <AdminSaveBar dirty={dirty} saving={saving} onSave={() => void handleSave()} onDiscard={discardLocalChanges} label="Há alterações locais no rascunho da Home" />
    </div>
  );
}
