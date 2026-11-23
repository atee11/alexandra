import type { Metadata } from 'next';
import { SysorgShell } from '@/components/sysorg/Shell';

export const metadata: Metadata = { title: 'Alexandra – Rendszerszervezés' };

export default function SysorgLayout({ children }: { children: React.ReactNode }) {
  return <SysorgShell>{children}</SysorgShell>;
}
