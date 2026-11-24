import { ClassroomsBrowser } from '@/components/classrooms/ClassroomsBrowser';
import { getStudentsWithCheckIn } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ClassroomsPage() {
  const data = await getStudentsWithCheckIn();

  return (
    <ClassroomsBrowser
      students={data.students}
      activeSession={data.activeSession}
      sourceMode={data.sourceMode}
    />
  );
}
