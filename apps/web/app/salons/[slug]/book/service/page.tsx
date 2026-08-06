'use client';

import { PublicShell } from '@salonomia/ui';
import { useRouter } from 'next/navigation';
import { useBookingContext } from '../_components/BookingContext';
import { BookingStepper } from '../_components/BookingStepper';

function formatMoney(amountMinorUnits: number, currency: string): string {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(
    amountMinorUnits / 100,
  );
}

export default function ServiceStep() {
  const { salon, draft, setService } = useBookingContext();
  const router = useRouter();

  const hasServices =
    salon.serviceCategories.length > 0 || salon.uncategorizedServices.length > 0;

  function handleSelect(serviceId: string) {
    setService(serviceId);
    router.push(`/salons/${salon.slug}/book/stylist`);
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-xl">
        <a
          href={`/salons/${salon.slug}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          ← {salon.name}
        </a>

        <div className="mt-4">
          <BookingStepper />
        </div>

        <h1 className="mt-6 text-2xl font-semibold text-text-primary">Choose a service</h1>

        {!hasServices && (
          <p className="mt-4 text-text-secondary">No services are available at this time.</p>
        )}

        <div className="mt-4 flex flex-col gap-6">
          {salon.serviceCategories.map((category) => (
            <div key={category.id}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                {category.name}
              </h2>
              <ul className="flex flex-col gap-2" role="listbox" aria-label={category.name}>
                {category.services.map((service) => (
                  <li key={service.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={draft.serviceId === service.id}
                      onClick={() => handleSelect(service.id)}
                      className={`w-full rounded-[var(--radius-sm)] border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        draft.serviceId === service.id
                          ? 'border-accent bg-accent/5'
                          : 'border-border bg-surface-raised hover:border-accent/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-text-primary">{service.name}</p>
                          {service.description && (
                            <p className="mt-0.5 text-sm text-text-secondary">
                              {service.description}
                            </p>
                          )}
                          <p className="mt-1 text-sm text-text-secondary">
                            {service.durationMinutes} min
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold text-text-primary">
                          {formatMoney(service.priceAmount, service.currency)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {salon.uncategorizedServices.length > 0 && (
            <div>
              {salon.serviceCategories.length > 0 && (
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Other services
                </h2>
              )}
              <ul className="flex flex-col gap-2" role="listbox" aria-label="Services">
                {salon.uncategorizedServices.map((service) => (
                  <li key={service.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={draft.serviceId === service.id}
                      onClick={() => handleSelect(service.id)}
                      className={`w-full rounded-[var(--radius-sm)] border p-4 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                        draft.serviceId === service.id
                          ? 'border-accent bg-accent/5'
                          : 'border-border bg-surface-raised hover:border-accent/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-text-primary">{service.name}</p>
                          {service.description && (
                            <p className="mt-0.5 text-sm text-text-secondary">
                              {service.description}
                            </p>
                          )}
                          <p className="mt-1 text-sm text-text-secondary">
                            {service.durationMinutes} min
                          </p>
                        </div>
                        <p className="shrink-0 font-semibold text-text-primary">
                          {formatMoney(service.priceAmount, service.currency)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </PublicShell>
  );
}
