import { DepartmentsBrowser } from '@/components/departments/DepartmentsBrowser';
import { getStudentsWithCheckIn } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function DepartmentsPage() {
  const data = await getStudentsWithCheckIn();

  return (
    <DepartmentsBrowser
      students={data.students}
      departments={data.departments}
      sourceMode={data.sourceMode}
    />
  );
}
