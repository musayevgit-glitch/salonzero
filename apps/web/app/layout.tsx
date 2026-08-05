import type { ReactNode } from 'react';

export const metadata = {
  title: 'Salonomia',
  description: 'Discover and book salons.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
