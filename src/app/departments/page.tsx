import { DepartmentsBrowser } from '@/components/departments/DepartmentsBrowser';
import { getStudentsWithCheckIn } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function DepartmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string }>;
}) {
  const [data, params] = await Promise.all([getStudentsWithCheckIn(), searchParams]);

  return (
    <DepartmentsBrowser
      students={data.students}
      departments={data.departments}
      sourceMode={data.sourceMode}
      initialDeptName={params.dept || null}
    />
  );
}
