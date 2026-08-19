'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getInitials } from '../../../../lib/initials';

interface PortfolioItem {
  id: string;
  imageUrl: string;
  caption: string | null;
}

interface Props {
  employee: {
    id: string;
    fullName: string;
    bio: string | null;
    portfolio: PortfolioItem[];
  };
  salonName: string;
  salonSlug: string;
}

export function StylistCard({ employee, salonName, salonSlug }: Props) {
  const t = useTranslations('stylists');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setModalOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const profileImg = employee.portfolio[0]?.imageUrl ?? null;
  const sampleImgs = employee.portfolio.slice(0, 3);

  return (
    <>
      <div
        style={{
          background: 'white',
          border: '1px solid #e4d4f4',
          borderRadius: 16,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 2px 8px rgba(30,27,46,0.05)',
        }}
      >
        {/* Top: avatar + name/salon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '1rem 1rem 0.75rem' }}>
          {/* Profile photo */}
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              overflow: 'hidden',
              flexShrink: 0,
              background: '#f3e8ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #e4d4f4',
            }}
          >
            {profileImg ? (
              <img
                src={profileImg}
                alt={employee.fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ fontSize: '1.15rem', fontWeight: 700, color: '#5b21b6', letterSpacing: '0.02em' }}>
                {getInitials(employee.fullName)}
              </span>
            )}
          </div>

          {/* Name + salon */}
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#1e1b2e', lineHeight: 1.3 }}>
              {employee.fullName}
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#7c6fa0' }}>
              {salonName}
            </p>
          </div>
        </div>

        {/* 3 sample images */}
        {sampleImgs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, margin: '0 0 0.75rem' }}>
            {sampleImgs.map((item, i) => (
              <button
                key={item.id}
                type="button"
                aria-label={item.caption ?? `${t('portfolioTitle')} ${i + 1}`}
                onClick={() => { setModalIndex(i); setModalOpen(true); }}
                style={{
                  padding: 0,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.caption ?? ''}
                  style={{
                    width: '100%',
                    aspectRatio: '1/1',
                    objectFit: 'cover',
                    display: 'block',
                  }}
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', padding: '0 1rem 1rem' }}>
          {employee.portfolio.length > 0 && (
            <button
              type="button"
              onClick={() => { setModalIndex(0); setModalOpen(true); }}
              style={{
                flex: 1,
                padding: '0.55rem 0',
                borderRadius: 10,
                border: '1.5px solid #e4d4f4',
                background: 'white',
                color: '#7c3aed',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.3rem',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <rect x="1" y="1" width="5" height="5" rx="1.5" stroke="#7c3aed" strokeWidth="1.3" />
                <rect x="8" y="1" width="5" height="5" rx="1.5" stroke="#7c3aed" strokeWidth="1.3" />
                <rect x="1" y="8" width="5" height="5" rx="1.5" stroke="#7c3aed" strokeWidth="1.3" />
                <rect x="8" y="8" width="5" height="5" rx="1.5" stroke="#7c3aed" strokeWidth="1.3" />
              </svg>
              {t('portfolioTitle')}
            </button>
          )}
          <a
            href={`/salons/${salonSlug}/book/service?employee=${employee.id}`}
            style={{
              flex: 1,
              padding: '0.55rem 0',
              borderRadius: 10,
              background: '#7c3aed',
              color: 'white',
              fontSize: '0.8rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.3rem',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="11" height="9" rx="1.5" stroke="white" strokeWidth="1.2" />
              <path d="M4 3V2a2 2 0 0 1 4 0v1" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {t('bookStylist')}
          </a>
        </div>
      </div>

      {/* Portfolio modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${employee.fullName} — ${t('portfolioTitle')}`}
          onClick={() => setModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(30,27,46,0.7)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 20,
              width: '100%',
              maxWidth: 480,
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderBottom: '1px solid #e4d4f4' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: '#f3e8ff', border: '1.5px solid #e4d4f4', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {profileImg
                    ? <img src={profileImg} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontWeight: 700, fontSize: '0.8rem', color: '#5b21b6' }}>{getInitials(employee.fullName)}</span>
                  }
                </div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: '#1e1b2e' }}>{employee.fullName}</p>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#6b5d8a' }}>{t('portfolioTitle')}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label={t('close')}
                onClick={() => setModalOpen(false)}
                style={{ background: '#f3e8ff', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 2l10 10M12 2L2 12" stroke="#7c3aed" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {/* Main image */}
            <div style={{ flex: 1, overflow: 'hidden', background: '#f3e8ff' }}>
              <img
                src={employee.portfolio[modalIndex]?.imageUrl}
                alt={employee.portfolio[modalIndex]?.caption ?? ''}
                style={{ width: '100%', height: 280, objectFit: 'cover', display: 'block' }}
              />
            </div>

            {/* Caption */}
            {employee.portfolio[modalIndex]?.caption && (
              <p style={{ margin: 0, padding: '0.75rem 1.25rem 0', fontSize: '0.82rem', color: '#6b5d8a' }}>
                {employee.portfolio[modalIndex].caption}
              </p>
            )}

            {/* Thumbnails */}
            {employee.portfolio.length > 1 && (
              <div style={{ display: 'flex', gap: '0.4rem', padding: '0.75rem 1.25rem 1.25rem', overflowX: 'auto' }}>
                {employee.portfolio.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setModalIndex(i)}
                    aria-label={item.caption ?? `${t('portfolioTitle')} ${i + 1}`}
                    aria-pressed={modalIndex === i}
                    style={{
                      flexShrink: 0,
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      overflow: 'hidden',
                      border: modalIndex === i ? '2.5px solid #7c3aed' : '2px solid transparent',
                      padding: 0,
                      cursor: 'pointer',
                      background: 'none',
                    }}
                  >
                    <img src={item.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
