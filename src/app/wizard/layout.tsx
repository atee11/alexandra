'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { WizardSidebar } from '@/components/wizard/WizardSidebar';
import { JsonPreview }   from '@/components/json-preview/JsonPreview';
import { WizardFooter }  from '@/components/wizard/WizardFooter';
import { useProjectStore } from '@/lib/store';

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  // Re-hydrate from localStorage after SSR mount
  useEffect(() => {
    useProjectStore.persist.rehydrate();
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Left sidebar — hidden on mobile, visible md+ */}
      <div className="hidden md:flex">
        <WizardSidebar />
      </div>

      {/* Center — current step content */}
      <main className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Link href="/studio" className="studio-focus flex shrink-0 items-center gap-2 border-b border-gray-200 bg-white px-4 py-3 text-sm text-violet-700 md:hidden">
          <ArrowLeft size={16} aria-hidden="true" /> Alexandra · Tervezőtér
        </Link>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8">
            {children}
          </div>
        </div>
        <WizardFooter />
      </main>

      {/* Right panel — hidden on mobile and small screens */}
      <div className="hidden lg:flex">
        <JsonPreview />
      </div>
    </div>
  );
}
