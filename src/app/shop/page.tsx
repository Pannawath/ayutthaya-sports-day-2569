import type { Metadata } from 'next';
import { Lobster } from 'next/font/google';
import { JerseyShopWorkspace } from '@/components/shop/JerseyShopWorkspace';

const lobster = Lobster({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-lobster',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'สั่งจองเสื้อคณะสีชมพู 2569 · AYUTTHAYA SPORTS DAY',
  description:
    'ออกแบบและสั่งจองเสื้อกีฬาสีคณะอยุธยา 2569 พร้อมดูตัวอย่างหน้า-หลังแบบเรียลไทม์และแนบสลิป PromptPay',
};

export default function ShopPage() {
  return (
    <div className={lobster.variable}>
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/gh/vsalvino/computer-modern@main/fonts/serif.css"
      />
      <JerseyShopWorkspace />
    </div>
  );
}
