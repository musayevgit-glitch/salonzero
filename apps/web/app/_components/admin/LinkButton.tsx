import NextLink from 'next/link';
import type { ComponentProps, ReactNode } from 'react';

export type LinkButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const variantClass: Record<LinkButtonVariant, string> = {
  primary: 'btn-lg btn-lg-primary',
  secondary: 'btn-lg btn-lg-secondary',
  ghost: 'btn-lg btn-lg-ghost',
  destructive: 'btn-lg btn-lg-destructive',
};

export interface LinkButtonProps extends Omit<ComponentProps<typeof NextLink>, 'className'> {
  variant?: LinkButtonVariant;
  size?: 'md' | 'sm';
  className?: string;
  children: ReactNode;
}

/** A link that looks like a Button — same geometry and variants, correct link semantics. */
export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: LinkButtonProps) {
  const sizeClass =
    size === 'sm' ? 'min-h-9 px-3 text-[0.8125rem]' : 'min-h-11 px-4 text-sm';

  return (
    <NextLink
      className={[
        'inline-flex items-center justify-center gap-2 rounded-[var(--radius-sm)] font-semibold no-underline',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
        sizeClass,
        variantClass[variant],
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {children}
    </NextLink>
  );
}
