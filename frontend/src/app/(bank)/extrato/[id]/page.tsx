import { Receipt } from '@/features/transactions/receipt';
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <Receipt id={id} />;
}
