import { ToastProvider } from '@salonomia/ui';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata = {
  title: 'Salonomia Dashboard',
  description: 'Salon and platform management.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
