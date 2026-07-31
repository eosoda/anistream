import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'icon';
}

const variants = {
  primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]',
  secondary: 'bg-[var(--surface-2)] text-white border border-[var(--border-strong)] hover:bg-[var(--surface-3)]',
  danger: 'bg-[var(--danger)] text-white hover:brightness-110',
  ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-white/7 hover:text-white',
};
const sizes = { sm: 'min-h-10 px-3 text-sm', md: 'min-h-11 px-4 text-sm', icon: 'size-11 p-0' };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = 'primary', size = 'md', className = '', type = 'button', ...props }, ref) {
  return <button ref={ref} type={type} className={`inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`} {...props} />;
});
