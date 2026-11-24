import { CheckInWorkspace } from '@/components/checkin/CheckInWorkspace';
import { getCurrentUserProfile } from '@/lib/auth';
import { getStudentsWithCheckIn } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function CheckInPage() {
  const [data, profile] = await Promise.all([
    getStudentsWithCheckIn(),
    getCurrentUserProfile(),
  ]);

  return (
    <CheckInWorkspace
      initialStudents={data.students}
      sessions={data.sessions}
      activeSession={data.activeSession}
      departments={data.departments}
      profile={profile}
      sourceMode={data.sourceMode}
    />
  );
}
