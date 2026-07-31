import { ReactNode, useId } from 'react';

export function FormField({ label, hint, error, children, id: providedId }: { label: string; hint?: string; error?: string; children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: true }) => ReactNode; id?: string }) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const descriptionId = hint || error ? `${id}-description` : undefined;
  return <div className="space-y-1.5"><label htmlFor={id} className="block text-sm font-semibold">{label}</label>{children({ id, 'aria-describedby': descriptionId, ...(error ? { 'aria-invalid': true as const } : {}) })}{(error || hint) && <p id={descriptionId} className={`text-xs ${error ? 'text-[var(--danger)]' : 'text-[var(--text-muted)]'}`}>{error || hint}</p>}</div>;
}
