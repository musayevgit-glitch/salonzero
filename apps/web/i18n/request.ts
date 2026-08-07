import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';
import { hasLocale } from 'next-intl';
import { cookies } from 'next/headers';

export default getRequestConfig(async () => {
  // With localePrefix:'never' next-intl won't detect locale from the URL.
  // We read it from the NEXT_LOCALE cookie set by the LanguageSwitcher.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = hasLocale(routing.locales, cookieLocale)
    ? cookieLocale
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
