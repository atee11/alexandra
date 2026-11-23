'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProjectStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const SSO_PROVIDERS = [
  { id: 'saml',  label: 'SAML 2.0',      desc: 'Vállalati SSO — Microsoft ADFS, Okta, Azure AD', module: 'samlauth' },
  { id: 'oauth', label: 'OAuth / OIDC',   desc: 'Google, Microsoft, GitHub, egyedi OIDC', module: 'openid_connect' },
  { id: 'ldap',  label: 'LDAP / Active Directory', desc: 'Céges Active Directory közvetlen kapcsolat', module: 'ldap' },
];

export function SSOStep() {
  const router = useRouter();
  const { project, markStepComplete } = useProjectStore();

  const saved = project.auth;
  const [ssoType, setSsoType]         = useState(saved?.sso ?? 'saml');
  const [provider, setProvider]       = useState(saved?.provider ?? '');
  const [selfReg, setSelfReg]         = useState(saved?.selfRegistration ?? false);

  function handleContinue() {
    markStepComplete('sso');
    router.push('/wizard/integrations');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Hogyan lépnek be a felhasználók?</h2>
        <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">
          Van-e céges belépési rendszer, amellyel a felhasználók azonosítják magukat?
        </p>
      </div>

      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">Belépési módszer</p>
        <div className="space-y-2">
          {SSO_PROVIDERS.map((p) => (
            <label key={p.id} className={cn(
              'flex items-start gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all',
              ssoType === p.id ? 'gradient-card--selected' : 'gradient-card',
            )}>
              <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                ssoType === p.id ? 'border-blue-500 bg-blue-500' : 'border-gray-300')}>
                {ssoType === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">{p.label}</span>
                <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-800 mb-1.5">
          Szolgáltató neve / URL (opcionális)
        </label>
        <input type="text" value={provider} onChange={(e) => setProvider(e.target.value)}
          placeholder="pl. Azure AD, Google Workspace, cégünk.hu/sso"
          className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <label className="flex items-center gap-3 p-3.5 rounded-xl border-2 border-gray-200 cursor-pointer hover:border-gray-300 bg-white">
        <input type="checkbox" className="accent-blue-600 w-4 h-4"
          checked={selfReg} onChange={(e) => setSelfReg(e.target.checked)} />
        <div>
          <span className="text-sm font-medium text-gray-900">Önregisztráció engedélyezett</span>
          <p className="text-xs text-gray-500">Felhasználók SSO nélkül is tudnak regisztrálni</p>
        </div>
      </label>

      <button onClick={handleContinue}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition-all shadow-sm">
        Mentés és tovább →
      </button>
    </div>
  );
}
