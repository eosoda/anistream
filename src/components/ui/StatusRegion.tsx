import { ReactNode } from 'react';
export function StatusRegion({ children, assertive = false, className = '' }: { children: ReactNode; assertive?: boolean; className?: string }) {
  return <div role="status" aria-live={assertive ? 'assertive' : 'polite'} aria-atomic="true" className={className}>{children}</div>;
}
