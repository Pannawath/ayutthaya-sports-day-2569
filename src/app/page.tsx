import { UnifiedHomeWorkspace } from '@/components/home/UnifiedHomeWorkspace';
import { getStudentsWithCheckIn } from '@/lib/data';

export const revalidate = 60;

export default async function HomePage() {
  const data = await getStudentsWithCheckIn();
  const publicStudents = data.students.map((s) => ({
    ...s,
    studentCode: null,
    qrToken: '',
  }));

  return (
    <UnifiedHomeWorkspace
      students={publicStudents}
      departments={data.departments}
      activeSession={data.activeSession}
      sourceMode={data.sourceMode}
    />
  );
}
