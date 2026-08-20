'use client';

import { useState, type ReactNode } from 'react';

export interface SalonTab {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * Tab strip for the salon profile.
 *
 * Panels are rendered by the server component and handed over as React nodes, so switching
 * tabs never re-fetches. All panels stay in the DOM; the inactive ones are hidden with the
 * `hidden` attribute so assistive technology and in-page search skip them.
 */
export function SalonTabs({ tabs }: { tabs: SalonTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? '');

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const index = tabs.findIndex((tab) => tab.id === active);
    if (index < 0) return;
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    if (!next) return;
    e.preventDefault();
    setActive(next.id);
    document.getElementById(`salon-tab-${next.id}`)?.focus();
  }

  return (
    <div>
      <div role="tablist" className="sz-tablist" onKeyDown={onKeyDown}>
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              id={`salon-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`salon-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? 'sz-tab sz-tab-active' : 'sz-tab'}
              onClick={() => setActive(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`salon-panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`salon-tab-${tab.id}`}
          hidden={tab.id !== active}
          tabIndex={0}
          style={{ paddingTop: '1.5rem', outline: 'none' }}
        >
          {tab.content}
        </div>
      ))}

      <style>{`
        .sz-tablist {
          display: flex;
          gap: 0.25rem;
          border-bottom: 1px solid #e4d4f4;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .sz-tablist::-webkit-scrollbar { display: none; }
        .sz-tab {
          appearance: none;
          border: none;
          background: none;
          font-family: inherit;
          font-size: 0.92rem;
          font-weight: 600;
          color: #7c6fa0;
          padding: 0.85rem 1.1rem;
          cursor: pointer;
          white-space: nowrap;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          transition: color 0.15s, border-color 0.15s;
        }
        .sz-tab:hover { color: #4a3f6b; }
        .sz-tab-active { color: #6A5ACD; border-bottom-color: #6A5ACD; }
        .sz-tab:focus-visible { outline: 2px solid #7c3aed; outline-offset: -2px; border-radius: 8px; }
      `}</style>
    </div>
  );
}
