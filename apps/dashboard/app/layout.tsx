import type { ReactNode } from 'react';

export const metadata = {
  title: 'Salonomia Dashboard',
  description: 'Salon and platform management.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
