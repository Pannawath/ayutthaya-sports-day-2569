import { RegistrationForm } from '@/components/register/RegistrationForm';
import { getDepartmentsData, getPoliciesData, getStudentsData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const [{ students, sourceMode }, departments, policies] = await Promise.all([
    getStudentsData(),
    getDepartmentsData(),
    getPoliciesData(),
  ]);

  return (
    <RegistrationForm
      initialStudents={students}
      departments={departments}
      policies={policies}
      sourceMode={sourceMode}
    />
  );
}
