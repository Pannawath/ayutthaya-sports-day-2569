import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Sans_Thai, Prompt } from 'next/font/google';
import { AppShell } from '@/components/layout/AppShell';
import { getCurrentUserProfile } from '@/lib/auth';
import './globals.css';

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-prompt',
  display: 'swap',
});

const ibmThai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-ibm-thai',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'AYUTTHAYA SPORTS DAY 2569 · คณะสีชมพู (อยุธยา)',
  description:
    'ระบบลงทะเบียน เช็คชื่อ จัดสรรฝ่ายงาน และติดตามสถิติคณะสีชมพู อยุธยา 2569 โรงเรียนสารคามพิทยาคม',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#B32151',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const initialProfile = await getCurrentUserProfile();

  return (
    <html lang="th" className={`${prompt.variable} ${ibmThai.variable}`}>
      <body className="antialiased selection:bg-pinkteam-magenta selection:text-white">
        <AppShell initialProfile={initialProfile}>{children}</AppShell>
      </body>
    </html>
  );
}
