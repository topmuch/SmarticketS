import { redirect } from 'next/navigation';

/**
 * /scan/[reference] → redirects to /activate/[reference]
 * The activation page handles status-based routing:
 *   - pending_activation → shows 3-card activation form
 *   - in_transit → redirects to /retrieve/[reference]
 *   - delivered → redirects to /retrieve/[reference]
 */
export default async function ScanRedirectPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  redirect(`/activate/${reference}`);
}
