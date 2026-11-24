import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { getCurrentUserProfile } from '@/lib/auth';
import {
  getAttendanceStatistics,
  getAuditLogsData,
  getStudentsWithCheckIn,
  getUsersProfilesData,
} from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect('/login?next=/admin&reason=auth_required');
  }
  if (profile.role !== 'ADMIN') {
    redirect('/check-in?error=admin_only');
  }

  const [studentsData, stats, users, auditLogs] = await Promise.all([
    getStudentsWithCheckIn(),
    getAttendanceStatistics({ range: 'all' }),
    getUsersProfilesData(),
    getAuditLogsData(80),
  ]);

  return (
    <AdminDashboard
      profile={profile}
      initialStudents={studentsData.students}
      initialDepartments={studentsData.departments}
      initialPolicies={studentsData.policies}
      initialSessions={studentsData.sessions}
      initialStats={stats}
      initialUsers={users}
      initialAuditLogs={auditLogs}
    />
  );
}
