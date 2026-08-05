import { Suspense } from 'react';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Log in — Salonomia Dashboard' };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
