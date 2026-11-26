import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { syncLegacyStudentsIntoStore } from '@/lib/live-store';

export async function POST() {
  const store = await syncLegacyStudentsIntoStore(true);
  revalidatePath('/');
  return NextResponse.json({
    ok: true,
    totalStudents: store.students.length,
    syncedAt: store.lastSyncedAt,
  });
}
