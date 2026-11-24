export interface GradeConfig {
  grade: string;
  rooms: string[];
  locked?: boolean;
  note?: string;
}

export const GRADES: GradeConfig[] = [
  {
    grade: 'ม.1',
    rooms: ['ม.1/2', 'ม.1/9', 'ม.1/12'],
    locked: true,
    note: 'ม.1 สมาชิกฝ่ายสแตนเชียร์เท่านั้น (ต้องการตำแหน่งอื่นแจ้งพี่สตาฟ)',
  },
  { grade: 'ม.2', rooms: ['ม.2/3', 'ม.2/6', 'ม.2/13', 'ม.2/16'] },
  { grade: 'ม.3', rooms: ['ม.3/1', 'ม.3/7', 'ม.3/10', 'ม.3/17'] },
  { grade: 'ม.4', rooms: ['ม.4/4', 'ม.4/11', 'ม.4/14', 'ม.4/17'] },
  { grade: 'ม.5', rooms: ['ม.5/3', 'ม.5/10', 'ม.5/13'] },
  { grade: 'ม.6', rooms: ['ม.6/4', 'ม.6/7', 'ม.6/14'] },
];

export const ALL_ROOMS: string[] = GRADES.flatMap((g) => g.rooms);
export const LOCKED_ROOMS: string[] = GRADES.filter((g) => g.locked).flatMap((g) => g.rooms);

export const CENTRAL_POSITIONS: string[] = [
  'ประธานสี',
  'รองประธานสี',
  'เหรัญญิก',
  'ผู้ช่วยเหรัญญิก',
  'เลขานุการ',
  'รองเลขานุการ',
];

export const DEFAULT_DEPARTMENTS = [
  { name: 'ฝ่ายอุปกรณ์', deputyLabel: null, maxCapacity: null, hasSports: false, isStand: false, isClosed: false, closedNote: null, m1Only: false, noStaff: true, sortOrder: 1 },
  { name: 'ฝ่ายผู้นำเชียร์ (หลีด)', deputyLabel: null, maxCapacity: 18, hasSports: false, isStand: false, isClosed: false, closedNote: null, m1Only: false, noStaff: false, sortOrder: 2 },
  { name: 'ฝ่ายสวัสดิการ', deputyLabel: 'รองประธานฝ่ายสวัสดิการ', maxCapacity: null, hasSports: false, isStand: false, isClosed: false, closedNote: null, m1Only: false, noStaff: true, sortOrder: 3 },
  { name: 'ฝ่ายกราฟิก', deputyLabel: null, maxCapacity: null, hasSports: false, isStand: false, isClosed: false, closedNote: null, m1Only: false, noStaff: true, sortOrder: 4 },
  { name: 'ฝ่ายกีฬา', deputyLabel: null, maxCapacity: null, hasSports: true, isStand: false, isClosed: true, closedNote: 'รอประกาศคัดตัวนักกีฬา', m1Only: false, noStaff: false, sortOrder: 5 },
  { name: 'ฝ่ายสแตนเชียร์', deputyLabel: null, maxCapacity: null, hasSports: false, isStand: true, isClosed: false, closedNote: null, m1Only: false, noStaff: false, sortOrder: 6 },
  { name: 'ฝ่ายขบวน', deputyLabel: null, maxCapacity: null, hasSports: false, isStand: false, isClosed: false, closedNote: null, m1Only: false, noStaff: false, sortOrder: 7 },
  { name: 'ฝ่ายดรัมเมเยอร์', deputyLabel: null, maxCapacity: 12, hasSports: false, isStand: false, isClosed: false, closedNote: null, m1Only: false, noStaff: false, sortOrder: 8 },
] as const;

export const NO_STAFF_DEPARTMENTS: string[] = ['ฝ่ายอุปกรณ์', 'ฝ่ายสวัสดิการ', 'ฝ่ายกราฟิก'];

export const SPORT_TYPES: string[] = [
  'บาสเกตบอล',
  'ฟุตบอล',
  'ตะกร้อ',
  'วอลเลย์บอล',
  'ปิงปอง',
  'แบดมินตัน',
  'กีฬาวิ่ง',
  'E-sports (RoV)',
  'E-sports (Free Fire)',
  'E-sports (eFootball)',
];

export const NUMBERS: string[] = (() => {
  const arr: string[] = [];
  (['ก', 'ข'] as const).forEach((group) => {
    for (let n = 1; n <= 20; n++) {
      arr.push(`${n} ${group}`);
    }
  });
  return arr;
})();

export const DEFAULT_POLICIES = {
  strictOnePerson: true,
  lockM1Registration: true,
  m1StandOnly: false,
};

export const LEGACY_GAS_API_URL =
  process.env.LEGACY_GAS_API_URL ||
  'https://script.google.com/macros/s/AKfycbx1QT3y_q-xjeO0n24re3G8aEnGHMCtYiUQyWIg6AWqvZdomSg9odjqqj5JnGYWsqJW/exec';

export const SHOP_URL = process.env.NEXT_PUBLIC_SHOP_URL || '/shop';

export function extractGradeFromRoom(classRoom: string): string {
  const m = String(classRoom || '').match(/^(ม\.\d)/);
  return m ? m[1] : String(classRoom || '').split('/')[0] || 'ไม่ระบุ';
}
