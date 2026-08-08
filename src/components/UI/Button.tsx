import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  children,
  className,
  ...props
}: ButtonProps) => {
  // Pill shape, soft lift on hover — mirrors the landing page's .btn
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none active:translate-y-px';
  
  const variants = {
    primary: 'bg-primary-600 text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-600/30 focus:ring-primary-600',
    secondary: 'bg-secondary-500 text-primary-900 shadow-lg shadow-secondary-500/30 hover:bg-secondary-400 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-secondary-500/40 focus:ring-secondary-400',
    danger: 'bg-red-600 text-white shadow-lg shadow-red-600/25 hover:bg-red-700 hover:-translate-y-0.5 hover:shadow-xl focus:ring-red-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500',
  };
  
  const sizes = {
    sm: 'px-4 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };
  
  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
};
