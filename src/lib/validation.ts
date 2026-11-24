import { z } from 'zod';
import {
  ALL_ROOMS,
  CENTRAL_POSITIONS,
  LOCKED_ROOMS,
  NUMBERS,
  SPORT_TYPES,
  extractGradeFromRoom,
} from '@/lib/constants';
import type {
  DepartmentRecord,
  RegistrationPolicies,
  StudentRecord,
} from '@/lib/types';

export const registrationInputSchema = z.object({
  studentCode: z
    .string()
    .trim()
    .max(20, 'เลขประจำตัวนักเรียนยาวเกินไป')
    .optional()
    .nullable(),
  fullName: z
    .string()
    .trim()
    .min(2, 'กรุณากรอกชื่อ-นามสกุล')
    .max(120, 'ชื่อ-นามสกุลยาวเกินไป'),
  nickname: z
    .string()
    .trim()
    .max(40, 'ชื่อเล่นยาวเกินไป')
    .optional()
    .default(''),
  classRoom: z.string().refine((val) => ALL_ROOMS.includes(val), {
    message: 'กรุณาเลือกชั้น/ห้องเรียนที่ถูกต้อง',
  }),
  numberLabel: z.string().refine((val) => NUMBERS.includes(val), {
    message: 'กรุณาเลือกเลขที่และกลุ่ม ก/ข ที่ถูกต้อง',
  }),
  roleCategory: z.enum(['department', 'central']).default('department'),
  centralPosition: z.string().trim().optional().nullable(),
  departmentName: z.string().trim().optional().nullable(),
  position: z.string().trim().optional().nullable(),
  sportType: z.string().trim().optional().nullable(),
});

export type ValidatedRegistrationInput = z.infer<typeof registrationInputSchema>;

export interface NormalizedRegistration {
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
}

export function normalizeAndValidateRegistration(params: {
  input: ValidatedRegistrationInput;
  existingStudents: StudentRecord[];
  departments: DepartmentRecord[];
  policies: RegistrationPolicies;
  bypassM1Lock?: boolean;
  excludeStudentId?: string;
}): { ok: true; record: NormalizedRegistration } | { ok: false; message: string; status: number } {
  const { input, existingStudents, departments, policies, bypassM1Lock = false, excludeStudentId } = params;
  const students = excludeStudentId
    ? existingStudents.filter((s) => s.id !== excludeStudentId)
    : existingStudents;

  const studentCode = input.studentCode ? input.studentCode.trim() : null;
  if (studentCode) {
    const codeExists = students.find((s) => s.studentCode && s.studentCode === studentCode);
    if (codeExists) {
      return {
        ok: false,
        status: 409,
        message: `เลขประจำตัว ${studentCode} ถูกลงทะเบียนไว้แล้ว (${codeExists.fullName})`,
      };
    }
  }

  if (policies.strictOnePerson) {
    const sameStudent = students.find(
      (s) => s.classRoom === input.classRoom && s.numberLabel === input.numberLabel
    );
    if (sameStudent) {
      return {
        ok: false,
        status: 409,
        message: `ห้อง ${input.classRoom} เลขที่ ${input.numberLabel} ลงทะเบียนแล้ว (${sameStudent.fullName}) ไม่สามารถลงซ้ำได้`,
      };
    }
  }

  const grade = extractGradeFromRoom(input.classRoom);
  const standDept = departments.find((d) => d.isStand || d.name === 'ฝ่ายสแตนเชียร์');

  // Lock M.1 students into ฝ่ายสแตนเชียร์ (สมาชิกฝ่าย) when policy active (unless admin explicitly overrides)
  if (!bypassM1Lock && policies.lockM1Registration && LOCKED_ROOMS.includes(input.classRoom)) {
    if (!standDept) {
      return { ok: false, status: 500, message: 'ไม่พบข้อมูลฝ่ายสแตนเชียร์ในระบบ' };
    }
    if (standDept.isClosed) {
      return {
        ok: false,
        status: 400,
        message: `${standDept.name} ปิดรับชั่วคราว (${standDept.closedNote || 'รอประกาศ'})`,
      };
    }
    return {
      ok: true,
      record: {
        studentCode,
        fullName: input.fullName,
        nickname: input.nickname || '',
        grade,
        classRoom: input.classRoom,
        numberLabel: input.numberLabel,
        roleCategory: 'department',
        centralPosition: null,
        departmentId: standDept.id,
        departmentName: standDept.name,
        position: 'สมาชิกฝ่าย',
        sportType: null,
        autoAssigned: true,
      },
    };
  }

  if (input.roleCategory === 'central') {
    const centralPos = (input.centralPosition || input.position || '').trim();
    if (!CENTRAL_POSITIONS.includes(centralPos)) {
      return { ok: false, status: 400, message: 'กรุณาเลือกตำแหน่งบริหารคณะสีที่ถูกต้อง' };
    }
    const taken = students.find(
      (s) => s.roleCategory === 'central' && s.centralPosition === centralPos
    );
    if (taken) {
      return {
        ok: false,
        status: 409,
        message: `ตำแหน่ง "${centralPos}" มีผู้รับแล้ว (${taken.fullName})`,
      };
    }

    return {
      ok: true,
      record: {
        studentCode,
        fullName: input.fullName,
        nickname: input.nickname || '',
        grade,
        classRoom: input.classRoom,
        numberLabel: input.numberLabel,
        roleCategory: 'central',
        centralPosition: centralPos,
        departmentId: null,
        departmentName: null,
        position: centralPos,
        sportType: null,
        autoAssigned: false,
      },
    };
  }

  // Department registration
  const deptName = (input.departmentName || '').trim();
  const dept = departments.find((d) => d.name === deptName);
  if (!dept) {
    return { ok: false, status: 400, message: 'กรุณาเลือกฝ่ายงานที่ถูกต้อง' };
  }

  if (!bypassM1Lock && dept.isClosed) {
    return {
      ok: false,
      status: 400,
      message: `${dept.name} ปิดรับชั่วคราว (${dept.closedNote || 'รอคัดตัว'})`,
    };
  }

  if (!bypassM1Lock && dept.m1Only && policies.m1StandOnly && !input.classRoom.startsWith('ม.1')) {
    return {
      ok: false,
      status: 400,
      message: 'ฝ่ายสแตนเชียร์เปิดรับเฉพาะนักเรียนระดับชั้น ม.1 เท่านั้น',
    };
  }

  if (!bypassM1Lock && typeof dept.maxCapacity === 'number' && dept.maxCapacity > 0) {
    const uniqueStudentsInDept = new Set(
      students
        .filter((s) => s.departmentName === dept.name)
        .map((s) => `${s.classRoom}|${s.numberLabel}`)
    );
    if (uniqueStudentsInDept.size >= dept.maxCapacity) {
      return {
        ok: false,
        status: 409,
        message: `ขออภัย ${dept.name} มีผู้ลงทะเบียนครบตามโควตาแล้ว (${dept.maxCapacity} คน)`,
      };
    }
  }

  const chosenPosition = (input.position || '').trim();
  if (!chosenPosition) {
    return { ok: false, status: 400, message: 'กรุณาเลือกตำแหน่งในฝ่าย' };
  }

  let chosenSport: string | null = null;
  if (dept.hasSports) {
    if (chosenPosition !== 'ประธานฝ่าย') {
      chosenSport = (input.sportType || '').trim();
      if (!SPORT_TYPES.includes(chosenSport)) {
        return { ok: false, status: 400, message: 'กรุณาเลือกประเภทกีฬาที่ถูกต้อง' };
      }
      if (chosenPosition === 'หัวหน้ากีฬา') {
        const capTaken = students.find(
          (s) =>
            s.departmentName === dept.name &&
            s.sportType === chosenSport &&
            s.position === 'หัวหน้ากีฬา'
        );
        if (capTaken) {
          return {
            ok: false,
            status: 409,
            message: `ตำแหน่งหัวหน้ากีฬา ${chosenSport} มีผู้รับแล้ว (${capTaken.fullName})`,
          };
        }
      }
    }
  }

  if (chosenPosition === 'ประธานฝ่าย') {
    const presTaken = students.find(
      (s) => s.departmentName === dept.name && s.position === 'ประธานฝ่าย'
    );
    if (presTaken) {
      return {
        ok: false,
        status: 409,
        message: `ตำแหน่งประธาน${dept.name} มีผู้รับแล้ว (${presTaken.fullName})`,
      };
    }
  }

  if (dept.deputyLabel && chosenPosition === dept.deputyLabel) {
    const depTaken = students.find(
      (s) => s.departmentName === dept.name && s.position === dept.deputyLabel
    );
    if (depTaken) {
      return {
        ok: false,
        status: 409,
        message: `ตำแหน่ง ${dept.deputyLabel} มีผู้รับแล้ว (${depTaken.fullName})`,
      };
    }
  }

  return {
    ok: true,
    record: {
      studentCode,
      fullName: input.fullName,
      nickname: input.nickname || '',
      grade,
      classRoom: input.classRoom,
      numberLabel: input.numberLabel,
      roleCategory: 'department',
      centralPosition: null,
      departmentId: dept.id,
      departmentName: dept.name,
      position: chosenPosition,
      sportType: chosenSport,
      autoAssigned: false,
    },
  };
}
