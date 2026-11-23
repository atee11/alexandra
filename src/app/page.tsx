import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { asset } from '@/lib/utils';

export default function LandingPage() {
  return (
    <main className="studio-surface flex min-h-screen items-center justify-center px-6 py-12">
      <div className="studio-fade relative flex flex-col items-center text-center">
        <Link href="/studio" className="brand-entry group max-w-full rounded-3xl px-3 pb-7 pt-2 sm:px-8" aria-label="Alexandra – belépés a tervezőtérbe">
          <Image
            src={asset('/logo-mark.png')}
            alt=""
            width={280}
            height={280}
            priority
            className="mx-auto h-auto w-56 max-w-full transition-transform duration-500 motion-safe:group-hover:scale-105 sm:w-[280px]"
          />
          <h1 className="relative -mt-14 text-[34px] font-semibold leading-none tracking-[0.2em] text-purple-800">
            Alexandra
          </h1>
          <p className="relative mt-4 text-xs uppercase tracking-[0.28em] text-slate-500">
            Az ötlettől a tiszta tervig
          </p>
          <span className="brand-cta relative mt-3 inline-flex items-center gap-3 text-sm font-medium text-violet-700">
            Belépés a tervezőtérbe
            <ArrowRight size={17} aria-hidden="true" className="transition-transform motion-safe:group-hover:translate-x-1" />
          </span>
        </Link>
      </div>
    </main>
  );
}
