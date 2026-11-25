import { ClassroomsBrowser } from '@/components/classrooms/ClassroomsBrowser';
import { getStudentsWithCheckIn } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ClassroomsPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; room?: string }>;
}) {
  const [data, params] = await Promise.all([getStudentsWithCheckIn(), searchParams]);

  return (
    <ClassroomsBrowser
      students={data.students}
      activeSession={data.activeSession}
      sourceMode={data.sourceMode}
      initialGrade={params.grade || 'ALL'}
      initialRoom={params.room || ''}
    />
  );
}
