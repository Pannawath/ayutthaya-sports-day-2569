'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export type HomeView = 'departments' | 'home' | 'classrooms';

interface OpenViewOptions {
  dept?: string | null;
  grade?: string;
  room?: string;
}

interface HomeViewContextValue {
  activeView: HomeView;
  selectedDeptName: string | null;
  selectedGrade: string;
  selectedRoom: string;
  openView: (view: HomeView, opts?: OpenViewOptions) => void;
}

const HomeViewContext = createContext<HomeViewContextValue | null>(null);

export function HomeViewProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeView, setActiveView] = useState<HomeView>('home');
  const [selectedDeptName, setSelectedDeptName] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string>('ALL');
  const [selectedRoom, setSelectedRoom] = useState<string>('');

  const openView = useCallback(
    (view: HomeView, opts?: OpenViewOptions) => {
      setActiveView(view);
      if (opts?.dept !== undefined) setSelectedDeptName(opts.dept);
      if (opts?.grade !== undefined) setSelectedGrade(opts.grade);
      else if (view === 'classrooms' && !opts?.room) setSelectedGrade('ALL');
      if (opts?.room !== undefined) setSelectedRoom(opts.room);
      else if (view === 'classrooms' && opts?.grade === undefined) setSelectedRoom('');

      if (pathname !== '/') {
        router.push('/');
      } else if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [pathname, router]
  );

  return (
    <HomeViewContext.Provider
      value={{
        activeView,
        selectedDeptName,
        selectedGrade,
        selectedRoom,
        openView,
      }}
    >
      {children}
    </HomeViewContext.Provider>
  );
}

export function useHomeView() {
  const ctx = useContext(HomeViewContext);
  if (!ctx) {
    throw new Error('useHomeView must be used within HomeViewProvider');
  }
  return ctx;
}
