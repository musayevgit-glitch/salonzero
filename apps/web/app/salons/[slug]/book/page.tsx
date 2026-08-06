import { redirect } from 'next/navigation';

export default async function BookIndexPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/salons/${slug}/book/service`);
}
