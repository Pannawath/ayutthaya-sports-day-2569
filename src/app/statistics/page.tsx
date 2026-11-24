import { StatisticsDashboard } from '@/components/statistics/StatisticsDashboard';
import { getAttendanceStatistics, getSessionsData } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function StatisticsPage() {
  const [stats, sessions] = await Promise.all([
    getAttendanceStatistics({ range: 'all' }),
    getSessionsData(),
  ]);

  return <StatisticsDashboard initialStats={stats} sessions={sessions} />;
}
