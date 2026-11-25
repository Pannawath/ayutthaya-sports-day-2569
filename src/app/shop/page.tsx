import { JerseyShopWorkspace } from '@/components/shop/JerseyShopWorkspace';
import { createLiveStoreClient, type LiveJerseyOrderRow } from '@/lib/live-store';

export const dynamic = 'force-dynamic';

export default async function ShopPage() {
  const client = createLiveStoreClient();
  const { data } = await client
    .from('jersey_orders')
    .select('*')
    .order('created_at', { ascending: false });

  return <JerseyShopWorkspace initialOrders={(data as LiveJerseyOrderRow[]) || []} />;
}
