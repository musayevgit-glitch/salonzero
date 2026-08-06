import { Badge, Card, ErrorState, PublicShell } from '@salonomia/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getIsAuthenticated } from '../../../lib/fetch-api-server';
import { fetchPublicApi, PublicApiError } from '../../../lib/public-api';

interface PublicService {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  currency: string;
  durationMinutes: number;
}

interface SalonDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  addressLine: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  genderFocus: string | null;
  bookingPolicySummary: {
    autoConfirm: boolean;
    cancellationWindowHours: number;
    rescheduleWindowHours: number;
    minNoticeMinutes: number;
    maxAdvanceDays: number;
  } | null;
  approximateOpeningHours: { weekday: number; startMinuteOfDay: number; endMinuteOfDay: number }[];
  serviceCategories: { id: string; name: string; services: PublicService[] }[];
  uncategorizedServices: PublicService[];
  employees: {
    id: string;
    fullName: string;
    bio: string | null;
    portfolio: { id: string; imageUrl: string; caption: string | null }[];
  }[];
}

const GENDER_FOCUS_LABEL: Record<string, string> = {
  WOMEN: 'Women',
  MEN: 'Men',
  UNISEX: 'Unisex',
};

const WEEKDAY_LABEL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatMinuteOfDay(minutes: number): string {
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
}

function formatMoney(amountMinorUnits: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amountMinorUnits / 100);
}

async function loadSalon(slug: string): Promise<SalonDetail | null> {
  try {
    return await fetchPublicApi<SalonDetail>(`/public/salons/${slug}`);
  } catch (err) {
    if (err instanceof PublicApiError && err.status === 404) return null;
    throw err;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const salon = await loadSalon(slug);
  if (!salon) return { title: 'Salon not found — Salonomia' };
  return {
    title: `${salon.name} — Salonomia`,
    description: salon.description ?? `Book an appointment at ${salon.name}.`,
  };
}

function ServiceRow({ service, slug }: { service: PublicService; slug: string }) {
  return (
    <li className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="font-medium text-text-primary">{service.name}</p>
        {service.description ? <p className="text-sm text-text-secondary">{service.description}</p> : null}
        <p className="text-sm text-text-secondary">{service.durationMinutes} min</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <p className="font-medium text-text-primary">{formatMoney(service.priceAmount, service.currency)}</p>
        <a
          href={`/salons/${slug}/book/service`}
          className="rounded-[var(--radius-sm)] border border-accent px-3 py-1 text-xs font-medium text-accent hover:bg-accent/5"
        >
          Book
        </a>
      </div>
    </li>
  );
}

export default async function SalonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [isAuthenticated, salonResult] = await Promise.all([
    getIsAuthenticated(),
    loadSalon(slug).catch((err) => err as Error),
  ]);

  if (salonResult instanceof Error) {
    return (
      <PublicShell isAuthenticated={isAuthenticated}>
        <ErrorState
          title="Couldn't load this salon"
          description={salonResult instanceof PublicApiError ? salonResult.message : 'Something went wrong.'}
        />
      </PublicShell>
    );
  }

  const salon = salonResult;
  if (!salon) notFound();

  const hasServices = salon.serviceCategories.length > 0 || salon.uncategorizedServices.length > 0;

  return (
    <PublicShell isAuthenticated={isAuthenticated}>
      <div className="flex flex-col gap-8 pb-20 lg:pb-0">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h1 className="text-3xl font-semibold text-text-primary">{salon.name}</h1>
            {salon.genderFocus ? (
              <Badge>{GENDER_FOCUS_LABEL[salon.genderFocus] ?? salon.genderFocus}</Badge>
            ) : null}
          </div>
          {salon.description ? <p className="mt-2 text-text-secondary">{salon.description}</p> : null}
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-text-primary">Contact &amp; location</h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            {salon.addressLine ? (
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-text-secondary">Address</dt>
                <dd>{salon.addressLine}</dd>
              </div>
            ) : null}
            {salon.city ? (
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-text-secondary">City</dt>
                <dd>{salon.city}</dd>
              </div>
            ) : null}
            {salon.phone ? (
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-text-secondary">Phone</dt>
                <dd>{salon.phone}</dd>
              </div>
            ) : null}
            {salon.email ? (
              <div className="flex flex-wrap justify-between gap-x-3">
                <dt className="text-text-secondary">Email</dt>
                <dd className="break-all">{salon.email}</dd>
              </div>
            ) : null}
          </dl>
        </Card>

        {salon.approximateOpeningHours.length > 0 ? (
          <Card>
            <h2 className="text-lg font-semibold text-text-primary">Opening hours</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Based on stylists&apos; working schedules — actual availability for a specific service
              may vary.
            </p>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {salon.approximateOpeningHours.map((h) => (
                <li key={h.weekday} className="flex justify-between">
                  <span className="text-text-secondary">{WEEKDAY_LABEL[h.weekday]}</span>
                  <span>
                    {formatMinuteOfDay(h.startMinuteOfDay)} – {formatMinuteOfDay(h.endMinuteOfDay)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {salon.bookingPolicySummary ? (
          <Card>
            <h2 className="text-lg font-semibold text-text-primary">Booking policy</h2>
            <ul className="mt-3 flex flex-col gap-1 text-sm text-text-secondary">
              <li>
                {salon.bookingPolicySummary.autoConfirm
                  ? 'Reservations are confirmed instantly.'
                  : 'Reservations require salon confirmation before they are final.'}
              </li>
              <li>
                Cancellations accepted up to {salon.bookingPolicySummary.cancellationWindowHours} hours
                before the appointment.
              </li>
              <li>
                Reschedules accepted up to {salon.bookingPolicySummary.rescheduleWindowHours} hours
                before the appointment.
              </li>
            </ul>
          </Card>
        ) : null}

        <Card id="services">
          <h2 className="text-lg font-semibold text-text-primary">Services</h2>
          {hasServices ? (
            <div className="mt-3 flex flex-col gap-4">
              {salon.serviceCategories.map((category) => (
                <div key={category.id}>
                  <h3 className="text-sm font-semibold text-text-secondary">{category.name}</h3>
                  <ul className="divide-y divide-border">
                    {category.services.map((s) => (
                      <ServiceRow key={s.id} service={s} slug={salon.slug} />
                    ))}
                  </ul>
                </div>
              ))}
              {salon.uncategorizedServices.length > 0 ? (
                <div>
                  {salon.serviceCategories.length > 0 ? (
                    <h3 className="text-sm font-semibold text-text-secondary">Other services</h3>
                  ) : null}
                  <ul className="divide-y divide-border">
                    {salon.uncategorizedServices.map((s) => (
                      <ServiceRow key={s.id} service={s} slug={salon.slug} />
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-secondary">No services listed yet.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text-primary">Stylists</h2>
          {salon.employees.length > 0 ? (
            <div className="mt-3 grid grid-cols-1 gap-6 sm:grid-cols-2">
              {salon.employees.map((employee) => (
                <div key={employee.id}>
                  <p className="font-medium text-text-primary">{employee.fullName}</p>
                  {employee.bio ? <p className="text-sm text-text-secondary">{employee.bio}</p> : null}
                  {employee.portfolio.length > 0 ? (
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {employee.portfolio.map((item) => (
                        // Plain <img>, not next/image: portfolio URLs are short-lived signed URLs
                        // (local-disk driver) or presigned S3 URLs (ADR-0008) that rotate on every
                        // fetch — next/image's remote-pattern cache keying doesn't fit a URL that's
                        // never the same twice, so native lazy-loading is the better fit here.
                        <img
                          key={item.id}
                          src={item.imageUrl}
                          alt={item.caption ?? `Portfolio work by ${employee.fullName}`}
                          className="aspect-square w-full rounded-[var(--radius-sm)] object-cover"
                          loading="lazy"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-secondary">No stylists listed yet.</p>
          )}
        </Card>

        <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface-raised p-4 shadow-[var(--shadow-md)] lg:hidden">
          <a
            href={`/salons/${salon.slug}/book/service`}
            className="flex min-h-11 w-full items-center justify-center rounded-[var(--radius-sm)] bg-accent px-4 text-sm font-medium text-white"
          >
            Book now
          </a>
        </div>
        <div className="hidden lg:block">
          <a
            href={`/salons/${salon.slug}/book/service`}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-sm)] bg-accent px-6 text-sm font-medium text-white"
          >
            Book now
          </a>
        </div>
      </div>
    </PublicShell>
  );
}
