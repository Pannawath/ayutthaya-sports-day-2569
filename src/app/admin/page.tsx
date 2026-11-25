import { StandaloneAdminApp } from '@/components/admin/StandaloneAdminApp';
import { getCurrentUserProfile } from '@/lib/auth';
import {
  getAttendanceStatistics,
  getAuditLogsData,
  getStudentsWithCheckIn,
} from '@/lib/data';
import { getAdminPinSetting, getDuplicateGroupsData } from '@/lib/live-store';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const profile = await getCurrentUserProfile();
  const isAdmin = profile?.role === 'ADMIN';

  if (!isAdmin) {
    return <StandaloneAdminApp initialAuthenticated={false} profile={null} />;
  }

  const [studentsData, stats, auditLogs, duplicateGroups, currentPin] = await Promise.all([
    getStudentsWithCheckIn(),
    getAttendanceStatistics({ range: 'all' }),
    getAuditLogsData(50),
    getDuplicateGroupsData(),
    getAdminPinSetting(),
  ]);

  return (
    <StandaloneAdminApp
      initialAuthenticated
      profile={profile}
      initialStudents={studentsData.students}
      initialDepartments={studentsData.departments}
      initialPolicies={studentsData.policies}
      initialSessions={studentsData.sessions}
      initialStats={stats}
      initialDuplicateGroups={duplicateGroups}
      initialAuditLogs={auditLogs}
      currentPin={currentPin}
    />
  );
}
