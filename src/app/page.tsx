import { UnifiedHomeWorkspace } from '@/components/home/UnifiedHomeWorkspace';
import { getStudentsWithCheckIn } from '@/lib/data';

export const revalidate = 60;

export default async function HomePage() {
  const data = await getStudentsWithCheckIn();

  return (
    <UnifiedHomeWorkspace
      students={data.students}
      departments={data.departments}
      activeSession={data.activeSession}
      sourceMode={data.sourceMode}
    />
  );
}
