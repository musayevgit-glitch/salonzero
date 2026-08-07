import { Suspense } from 'react';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata = { title: 'Reset password — Salonomia' };

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
