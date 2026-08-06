'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface PublicService {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
}

export interface SalonEmployee {
  id: string;
  fullName: string;
  bio: string | null;
  portfolio: { id: string; imageUrl: string; caption: string | null }[];
}

export interface SalonBookingData {
  id: string;
  slug: string;
  name: string;
  timezone: string;
  bookingPolicySummary: {
    autoConfirm: boolean;
    cancellationWindowHours: number;
    rescheduleWindowHours: number;
    minNoticeMinutes: number;
    maxAdvanceDays: number;
  } | null;
  serviceCategories: { id: string; name: string; services: PublicService[] }[];
  uncategorizedServices: PublicService[];
  employees: SalonEmployee[];
}

export interface BookingDraft {
  serviceId: string;
  employeeId: string | null;
  startAt: string;
  idempotencyKey: string;
}

interface BookingContextValue {
  salon: SalonBookingData;
  draft: Partial<BookingDraft>;
  draftLoaded: boolean;
  setService: (serviceId: string) => void;
  setStylist: (employeeId: string | null) => void;
  setStartAt: (startAt: string) => void;
  clearDraft: () => void;
}

const BookingContext = createContext<BookingContextValue | null>(null);

export function useBookingContext(): BookingContextValue {
  const ctx = useContext(BookingContext);
  if (!ctx) throw new Error('useBookingContext must be used inside BookingShell');
  return ctx;
}

function draftKey(slug: string) {
  return `salonomia:booking-draft:v1:${slug}`;
}

function readDraft(slug: string): Partial<BookingDraft> {
  try {
    const raw = sessionStorage.getItem(draftKey(slug));
    return raw ? (JSON.parse(raw) as Partial<BookingDraft>) : {};
  } catch {
    return {};
  }
}

function writeDraft(slug: string, next: Partial<BookingDraft>) {
  sessionStorage.setItem(draftKey(slug), JSON.stringify(next));
}

function ensureKey(prev: Partial<BookingDraft>): string {
  return prev.idempotencyKey ?? crypto.randomUUID();
}

export function BookingShell({
  salonData,
  children,
}: {
  salonData: SalonBookingData;
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<Partial<BookingDraft>>({});
  const [draftLoaded, setDraftLoaded] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    setDraft(readDraft(salonData.slug));
    setDraftLoaded(true);
  }, [salonData.slug]);

  const setService = useCallback(
    (serviceId: string) => {
      setDraft((prev) => {
        // Changing service resets stylist and time — they are no longer valid
        const next: Partial<BookingDraft> = { serviceId, idempotencyKey: ensureKey(prev) };
        writeDraft(salonData.slug, next);
        return next;
      });
    },
    [salonData.slug],
  );

  const setStylist = useCallback(
    (employeeId: string | null) => {
      setDraft((prev) => {
        const next: Partial<BookingDraft> = {
          ...prev,
          employeeId,
          startAt: undefined, // reset time; employee working hours differ
          idempotencyKey: ensureKey(prev),
        };
        writeDraft(salonData.slug, next);
        return next;
      });
    },
    [salonData.slug],
  );

  const setStartAt = useCallback(
    (startAt: string) => {
      setDraft((prev) => {
        const next: Partial<BookingDraft> = { ...prev, startAt, idempotencyKey: ensureKey(prev) };
        writeDraft(salonData.slug, next);
        return next;
      });
    },
    [salonData.slug],
  );

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(draftKey(salonData.slug));
    setDraft({});
  }, [salonData.slug]);

  const value = useMemo<BookingContextValue>(
    () => ({ salon: salonData, draft, draftLoaded, setService, setStylist, setStartAt, clearDraft }),
    [salonData, draft, draftLoaded, setService, setStylist, setStartAt, clearDraft],
  );

  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}
