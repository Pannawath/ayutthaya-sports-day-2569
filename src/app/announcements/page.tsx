import { AnnouncementsBoard } from '@/components/announcements/AnnouncementsBoard';
import { getCurrentUserProfile } from '@/lib/auth';
import { getAnnouncementsData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const [profile, params] = await Promise.all([getCurrentUserProfile(), searchParams]);
  const announcements = await getAnnouncementsData(profile?.role === 'ADMIN');

  return (
    <AnnouncementsBoard
      initialAnnouncements={announcements}
      profile={profile}
      initialSelectedId={params.id || null}
    />
  );
}
