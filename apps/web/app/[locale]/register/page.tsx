import { Suspense } from 'react';
import { RegisterForm } from './RegisterForm';

export const metadata = { title: 'Create account — Salonomia' };

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
