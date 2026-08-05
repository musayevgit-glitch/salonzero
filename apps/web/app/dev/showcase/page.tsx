import { notFound } from 'next/navigation';
import { ShowcaseClient } from './ShowcaseClient';

export const metadata = {
  robots: { index: false, follow: false },
};

// Internal component showcase (docs/Salonomia_Sonnet_From_Zero_To_Production_Prompts.md §7.2). Not
// linked from any nav; disabled outside development so it never ships as a public route.
export default function ShowcasePage() {
  if (process.env.NODE_ENV === 'production') {
    notFound();
  }

  return <ShowcaseClient />;
}
