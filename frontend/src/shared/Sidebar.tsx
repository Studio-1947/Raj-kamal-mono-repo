import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLang } from '../modules/lang/LangContext';

type Item = {
  label: string;
  to: string;
  icon: JSX.Element;
};

function IconHome(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-10.5z" />
    </svg>
  );
}

function IconChart(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" d="M4 20V6m6 14V10m6 10V4m4 16H2" />
    </svg>
  );
}

function IconBoxes(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M3 7l9-4 9 4-9 4-9-4zm0 5l9 4 9-4M3 7v10l9 4 9-4V7" />
    </svg>
  );
}

function IconTrophy(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M7 4h10v2a5 5 0 0 0 5 5h0a6 6 0 0 1-6 6H8a6 6 0 0 1-6-6h0a5 5 0 0 0 5-5V4zm5 13v3m-5 0h10" />
    </svg>
  );
}

function IconFile(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M6 2h7l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M13 2v6h6" />
    </svg>
  );
}

function IconCog(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6h0a1.65 1.65 0 0 0-.39 1L13.5 22a2 2 0 1 1-3 0l-.11-.99a1.65 1.65 0 0 0-.4-.99h0a1.65 1.65 0 0 0-1-.6A1.65 1.65 0 0 0 4.6 19.4l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1h0a1.65 1.65 0 0 0-1-.39L2 13.5a2 2 0 1 1 0-3l.99-.11a1.65 1.65 0 0 0 1-.4h0a1.65 1.65 0 0 0 .6-1A1.65 1.65 0 0 0 4.6 4.6l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6c.27.05.53.16.76.33h0c.28.21.5.48.65.8.15.32.22.67.2 1.02-.03.35-.15.69-.36.98a1.65 1.65 0 0 0-.33.76 1.65 1.65 0 0 0 .33.76c.21.29.33.63.36.98.02.35-.05.7-.2 1.02a1.65 1.65 0 0 0-.65.8h0A1.65 1.65 0 0 0 9 14.4c-.23.17-.49.28-.76.33A1.65 1.65 0 0 0 6.4 15" />
    </svg>
  );
}

function IconGlobe(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <circle cx="12" cy="12" r="9" strokeWidth="1.8" />
      <path strokeWidth="1.2" d="M3 12h18M12 3c2.5 3 2.5 15 0 18M9 3c-2 3-2 15 0 18m6-18c2 3 2 15 0 18" />
    </svg>
  );
}

function IconUser(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 22a8 8 0 1 1 16 0" />
    </svg>
  );
}

function IconChevron(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
      <path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { t } = useLang();

  const items: Item[] = [
    { label: t('home'), to: '/', icon: <IconHome className="h-5 w-5" /> },
    { label: t('sales'), to: '/dashboard', icon: <IconChart className="h-5 w-5" /> },
    { label: t('inventory'), to: '/inventory', icon: <IconBoxes className="h-5 w-5" /> },
    { label: t('rankings'), to: '/rankings', icon: <IconTrophy className="h-5 w-5" /> },
    { label: t('social_media'), to: '/social', icon: <IconFile className="h-5 w-5" /> },
  ];

  const secondary: Item[] = [
    { label: t('settings'), to: '/settings', icon: <IconCog className="h-5 w-5" /> },
    { label: t('language'), to: '/language', icon: <IconGlobe className="h-5 w-5" /> },
  ];

  return (
    <aside
      className={
        // Ensure a space between class groups so Tailwind utilities are parsed correctly
        `group relative flex h-full flex-col border-r border-gray-200 bg-white/90 backdrop-blur rounded-3xl overflow-hidden ` +
        `transition-[width] duration-300 ease-in-out ${collapsed ? 'w-[72px]' : 'w-64'}`
      }
    >
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-rose-100">
            <span className="text-sm font-semibold">RK</span>
          </div>
          {!collapsed && (
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-900">RajKamal</p>
              <p className="text-xs text-gray-500">Berojgaar Morcha</p>
            </div>
          )}
        </div>
        <button
          aria-label={collapsed ? t('expand') + ' sidebar' : t('collapse') + ' sidebar'}
          className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? t('expand') : t('collapse')}
        >
          <div className={`transition-transform ${collapsed ? '' : 'rotate-180'}`}>
            <IconChevron className="h-4 w-4" />
          </div>
        </button>
      </div>

      <nav className="mt-2 flex-1 px-2">
        <ul className="space-y-1">
          {items.map((it) => {
            const active = location.pathname === it.to;
            return (
              <li key={it.label}>
                <Link
                  to={it.to}
                  title={collapsed ? it.label : undefined}
                  className={
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm ` +
                    `${active ? 'bg-[#526BA3] text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
                  }
                >
                  <span className="text-gray-500">{it.icon}</span>
                  {!collapsed && <span className="truncate">{it.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="my-4 h-px w-full bg-gray-100" />

        <div className="rounded-lg bg-rose-50 px-3 py-2 text-rose-700">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <IconUser className="h-4 w-4" />
            </div>
            {!collapsed && <span className="text-sm">Amod M.</span>}
          </div>
        </div>

        <ul className="mt-4 space-y-1">
          {secondary.map((it) => (
            <li key={it.label}>
              <Link
                to={it.to}
                title={collapsed ? it.label : undefined}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                <span className="text-gray-500">{it.icon}</span>
                {!collapsed && <span className="truncate">{it.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto px-3 pb-3">
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? 'Expand' : 'Collapse'}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 py-2 text-xs text-gray-600 hover:bg-gray-200"
        >
          <IconChevron className={`h-4 w-4 transition-transform ${collapsed ? '' : 'rotate-180'}`} />
          {!collapsed && <span>{t('collapse')}</span>}
        </button>
      </div>
    </aside>
  );
}
