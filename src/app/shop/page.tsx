import type { Metadata } from 'next';
import { JerseyShopWorkspace } from '@/components/shop/JerseyShopWorkspace';

export const metadata: Metadata = {
  title: 'สั่งจองเสื้อคณะสีชมพู 2569 · AYUTTHAYA SPORTS DAY',
  description:
    'ออกแบบและสั่งจองเสื้อกีฬาสีคณะอยุธยา 2569 พร้อมดูตัวอย่างหน้า-หลังแบบเรียลไทม์และแนบสลิป PromptPay',
};

export default function ShopPage() {
  return <JerseyShopWorkspace />;
}
