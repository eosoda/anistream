'use client';
import { FormEvent, useEffect, useState } from 'react';
import { Button, FormField, StatusRegion } from '@/components/ui';
import { useConfirmation } from '@/context/ConfirmationContext';

async function post(url: string, body: unknown) { const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a ação.'); return payload; }

export function BroadcastOperation() {
  const [title, setTitle] = useState(''); const [content, setContent] = useState(''); const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); try { await post('/api/admin/broadcast', { title, content, type: 'INFO' }); setMessage('Comunicado publicado.'); setTitle(''); setContent(''); } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao publicar.'); } };
  return <OperationForm title="Novo comunicado" onSubmit={submit} message={message}><FormField label="Título">{(props) => <input {...props} required value={title} onChange={(e) => setTitle(e.target.value)} className="admin-field" />}</FormField><FormField label="Mensagem">{(props) => <textarea {...props} required rows={5} value={content} onChange={(e) => setContent(e.target.value)} className="admin-field resize-y" />}</FormField><Button type="submit">Publicar comunicado</Button></OperationForm>;
}

export function SystemOperation() {
  const [enabled, setEnabled] = useState(false); const [messageText, setMessageText] = useState('Estamos em manutenção para atualização de servidores.'); const [status, setStatus] = useState(''); const [loading, setLoading] = useState(true);
  useEffect(() => { const controller = new AbortController(); fetch('/api/maintenance', { signal: controller.signal }).then((response) => response.json()).then((data) => { setEnabled(Boolean(data.maintenance)); if (data.message) setMessageText(data.message); }).catch((error) => { if (error.name !== 'AbortError') setStatus('Não foi possível carregar o estado atual.'); }).finally(() => setLoading(false)); return () => controller.abort(); }, []);
  const submit = async (event: FormEvent) => { event.preventDefault(); try { await post('/api/admin/maintenance', { enabled: !enabled, message: messageText }); setEnabled(!enabled); setStatus(`Modo manutenção ${!enabled ? 'ativado' : 'desativado'}.`); } catch (error) { setStatus(error instanceof Error ? error.message : 'Falha ao atualizar.'); } };
  return <OperationForm title="Modo manutenção" onSubmit={submit} message={status}><FormField label="Mensagem pública">{(props) => <textarea {...props} rows={4} value={messageText} onChange={(e) => setMessageText(e.target.value)} className="admin-field" />}</FormField><Button type="submit" disabled={loading} variant={enabled ? 'danger' : 'primary'}>{loading ? 'Carregando estado…' : enabled ? 'Desativar manutenção' : 'Ativar manutenção'}</Button></OperationForm>;
}

export function BackupOperation() {
  const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false); const { confirm } = useConfirmation();
  const restore = async (file?: File) => { if (!file || busy) return; const accepted = await confirm({ title: 'Restaurar este backup?', description: <>O arquivo <strong>{file.name}</strong> ({Math.ceil(file.size / 1024)} KB) será aplicado ao catálogo atual. Exporte um backup antes de continuar.</>, confirmText: 'Restaurar dados', cancelText: 'Cancelar', variant: 'danger' }); if (!accepted) return; setBusy(true); try { const data = JSON.parse(await file.text()); const payload = await post('/api/admin/backup', data); setMessage(payload.message || 'Backup restaurado.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Arquivo inválido.'); } finally { setBusy(false); } };
  return <section className="operation-card"><h2 className="text-lg font-bold">Backup e restauração</h2><p className="text-sm text-[var(--text-secondary)]">Exporte uma cópia antes de restaurar dados. A restauração altera o catálogo atual.</p><div className="flex flex-wrap gap-3"><a href="/api/admin/backup" download className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 text-sm font-semibold text-black">Exportar JSON</a><label aria-disabled={busy} className="inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-control)] border border-[var(--danger)] px-4 text-sm font-semibold text-[var(--danger)]">{busy ? 'Restaurando…' : 'Restaurar JSON'}<input type="file" disabled={busy} accept="application/json,.json" className="sr-only" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void restore(file); }} /></label></div><StatusRegion>{message}</StatusRegion></section>;
}

export function IntegrationOperation() {
  const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); try { await post('/api/admin/webhooks', { name, url }); setMessage('Integração salva.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao salvar.'); } };
  return <OperationForm title="Novo webhook" onSubmit={submit} message={message}><FormField label="Nome">{(props) => <input {...props} required value={name} onChange={(e) => setName(e.target.value)} className="admin-field" />}</FormField><FormField label="URL do webhook">{(props) => <input {...props} required type="url" value={url} onChange={(e) => setUrl(e.target.value)} className="admin-field font-mono-data" />}</FormField><Button type="submit">Salvar integração</Button></OperationForm>;
}

export function ReleaseOperation() {
  const [version, setVersion] = useState(''); const [title, setTitle] = useState(''); const [content, setContent] = useState(''); const [message, setMessage] = useState('');
  const submit = async (event: FormEvent) => { event.preventDefault(); try { await post('/api/changelog', { version, title, content, type: 'IMPROVEMENT' }); setMessage('Release publicada.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao publicar.'); } };
  return <OperationForm title="Publicar release" onSubmit={submit} message={message}><FormField label="Versão" hint="Exemplo: 2.2.0">{(props) => <input {...props} required value={version} onChange={(e) => setVersion(e.target.value)} className="admin-field font-mono-data" />}</FormField><FormField label="Título">{(props) => <input {...props} required value={title} onChange={(e) => setTitle(e.target.value)} className="admin-field" />}</FormField><FormField label="Notas da versão">{(props) => <textarea {...props} required rows={8} value={content} onChange={(e) => setContent(e.target.value)} className="admin-field" />}</FormField><Button type="submit">Publicar no changelog</Button></OperationForm>;
}

function OperationForm({ title, onSubmit, message, children }: { title: string; onSubmit: (event: FormEvent) => void; message: string; children: React.ReactNode }) { return <form onSubmit={onSubmit} className="operation-card"><h2 className="text-lg font-bold">{title}</h2>{children}<StatusRegion className="min-h-5 text-sm text-[var(--text-secondary)]">{message}</StatusRegion></form>; }
