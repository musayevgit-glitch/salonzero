import { Suspense } from 'react';
import { AcceptInvitationForm } from './AcceptInvitationForm';

export const metadata = { title: 'Accept invitation — Salonomia Dashboard' };

export default function AcceptInvitationPage() {
  return (
    <Suspense>
      <AcceptInvitationForm />
    </Suspense>
  );
}
