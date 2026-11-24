export type UserRole = 'ADMIN' | 'STAFF';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface DepartmentRecord {
  id: string;
  name: string;
  deputyLabel: string | null;
  maxCapacity: number | null;
  hasSports: boolean;
  isStand: boolean;
  isClosed: boolean;
  closedNote: string | null;
  m1Only: boolean;
  noStaff: boolean;
  sortOrder: number;
}

export interface StudentRecord {
  id: string;
  legacyId: string | null;
  studentCode: string | null;
  fullName: string;
  nickname: string;
  grade: string;
  classRoom: string;
  numberLabel: string;
  roleCategory: 'department' | 'central';
  centralPosition: string | null;
  departmentId: string | null;
  departmentName: string | null;
  position: string;
  sportType: string | null;
  autoAssigned: boolean;
  qrToken: string;
  registeredAt: string;
}

export interface CheckInSessionRecord {
  id: string;
  title: string;
  eventDate: string;
  isActive: boolean;
  createdAt: string;
}

export type CheckInMethod = 'QR' | 'ID_SEARCH' | 'MANUAL' | 'BULK_PAPER';
export type CheckInStatus = 'PRESENT' | 'ABSENT';

export interface CheckInRecord {
  id: string;
  sessionId: string;
  studentId: string;
  status: CheckInStatus;
  method: CheckInMethod;
  note: string | null;
  checkedInBy: string | null;
  checkedInByName: string | null;
  checkedInAt: string;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  category: 'NEWS' | 'SCHEDULE';
  content: string;
  imageUrl: string | null;
  isPublished: boolean;
  createdBy: string | null;
  createdByName: string | null;
  publishedAt: string;
}

export interface RegistrationPolicies {
  strictOnePerson: boolean;
  lockM1Registration: boolean;
  m1StandOnly: boolean;
}

export interface AuditLogRecord {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface StudentWithCheckIn extends StudentRecord {
  checkedIn: boolean;
  checkIn: CheckInRecord | null;
}

export interface AttendanceSummaryStats {
  totalStudents: number;
  checkedInCount: number;
  pendingCount: number;
  attendanceRate: number;
  activeSession: CheckInSessionRecord | null;
  byDepartment: Array<{
    name: string;
    total: number;
    present: number;
    pending: number;
    rate: number;
    maxCapacity: number | null;
    isClosed: boolean;
  }>;
  byGrade: Array<{
    grade: string;
    total: number;
    present: number;
    pending: number;
    rate: number;
  }>;
  byRoom: Array<{
    room: string;
    grade: string;
    total: number;
    present: number;
    pending: number;
    rate: number;
  }>;
  timeline: Array<{
    bucket: string;
    count: number;
    cumulative: number;
  }>;
  sourceMode: 'supabase' | 'legacy-readonly';
}
