'use client';

import { useId, type SelectHTMLAttributes } from 'react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?: string;
  options: DropdownOption[];
  /** Renders the field at full width of its flex/grid cell. */
  fullWidth?: boolean;
}

/**
 * Public-site dropdown. Wraps a native <select> — it already ships correct keyboard and
 * screen-reader behaviour on every platform (see packages/ui Select) — and layers the
 * Salonomia trigger styling, chevron, hover and visible focus ring on top so every public
 * page uses one consistent control instead of ad-hoc inline-styled selects.
 */
export function Dropdown({ label, options, fullWidth = true, id, ...props }: DropdownProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        width: fullWidth ? '100%' : undefined,
        minWidth: 0,
      }}
    >
      {label ? (
        <label htmlFor={selectId} style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1b2e' }}>
          {label}
        </label>
      ) : null}
      <div style={{ position: 'relative', display: 'flex', width: '100%' }}>
        <select
          {...props}
          id={selectId}
          className="sz-dropdown"
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            width: '100%',
            height: 44,
            boxSizing: 'border-box',
            padding: '0 2.25rem 0 1rem',
            borderRadius: 10,
            border: '1px solid #e4d4f4',
            background: 'white',
            color: '#1e1b2e',
            fontSize: '0.9rem',
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: '0.85rem',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#7c3aed',
            display: 'flex',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 4.5L6 8l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
      <style>{`
        .sz-dropdown:hover { border-color: #c4b5fd; }
        .sz-dropdown:focus-visible {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124,58,237,0.25);
        }
        .sz-dropdown:disabled { opacity: 0.55; cursor: not-allowed; background: #faf5ff; }
      `}</style>
    </div>
  );
}

/** Secondary (outlined) button used for "Reset filters" and similar inline actions. */
export function SecondaryButton({
  children,
  onClick,
  type = 'button',
  href,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  href?: string;
}) {
  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    boxSizing: 'border-box',
    padding: '0 1.25rem',
    borderRadius: 10,
    border: '1.5px solid #7c3aed',
    background: 'white',
    color: '#7c3aed',
    fontSize: '0.9rem',
    fontWeight: 600,
    fontFamily: 'inherit',
    cursor: 'pointer',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };

  if (href) {
    return (
      <a href={href} className="sz-secondary-btn" style={style}>
        {children}
        <style>{SECONDARY_BTN_CSS}</style>
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} className="sz-secondary-btn" style={style}>
      {children}
      <style>{SECONDARY_BTN_CSS}</style>
    </button>
  );
}

const SECONDARY_BTN_CSS = `
  .sz-secondary-btn:hover { background: #f3e8ff; }
  .sz-secondary-btn:focus-visible {
    outline: 2px solid #7c3aed;
    outline-offset: 2px;
  }
`;
