import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLang } from '../modules/lang/LangContext';

type Item = {
  label: string;
  to: string;
  icon: JSX.Element;
};

// Default (inactive) Home icon
function IconHomeDefault(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M7.76458 0.662986C8.50022 0.159943 9.4999 0.159944 10.2355 0.662999L11.0887 1.24646C13.6098 2.97053 15.7742 5.08826 17.4776 7.50292L17.7512 7.89091C18.0861 8.36565 18.0625 8.93707 17.8014 9.36496C17.5458 9.78369 17.0785 10.0515 16.5491 10.0515H15.8194C15.8579 11.2449 15.7905 12.6769 15.6141 13.7078C15.4065 14.9218 14.2839 15.7143 13.089 15.7143H4.91115C3.71618 15.7143 2.59365 14.9218 2.386 13.7078C2.20968 12.6769 2.14228 11.2449 2.18066 10.0515H1.4509C0.921434 10.0515 0.454193 9.78369 0.198591 9.36495C-0.0625897 8.93706 -0.0862097 8.36564 0.248691 7.8909L0.52244 7.50284C2.2258 5.08823 4.39016 2.97055 6.91128 1.24652L7.76458 0.662986ZM9.32832 1.98961C9.13967 1.86059 8.86044 1.86059 8.67177 1.98961L7.81847 2.57313C5.44949 4.19313 3.42453 6.177 1.8357 8.42927L1.82506 8.44433H3.03274C3.25858 8.44433 3.47399 8.53936 3.62623 8.70616C3.77848 8.87294 3.85353 9.09609 3.83298 9.32099C3.72605 10.492 3.774 12.2902 3.97014 13.4369C4.02592 13.7629 4.37535 14.1071 4.91115 14.1071H6.53436V11.0022C6.53436 9.64059 7.6382 8.53675 8.99986 8.53675C10.3615 8.53675 11.4653 9.64059 11.4653 11.0022V14.1071H13.089C13.6247 14.1071 13.9742 13.7629 14.03 13.4369C14.2262 12.2902 14.2741 10.492 14.1672 9.32099C14.1466 9.09609 14.2217 8.87294 14.3739 8.70614C14.5261 8.53936 14.7415 8.44433 14.9674 8.44433H16.1749L16.1643 8.42933C14.5755 6.17702 12.5505 4.19311 10.1815 2.57307L9.32832 1.98961Z" fill="#282F43"/>
    </svg>
  );
}

// Active Home icon
function IconHomeActive(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path fillRule="evenodd" clipRule="evenodd" d="M7.83349 1.62608C8.52301 1.10234 9.47707 1.10234 10.1666 1.62609L11.0152 2.27071C13.5081 4.16425 15.6435 6.48671 17.3218 9.12926L17.5941 9.55792C18.1377 10.4139 17.5227 11.5329 16.5087 11.5329H15.6199C15.6713 12.7146 15.6068 13.8998 15.4263 15.0715C15.247 16.2359 14.2452 17.0952 13.0671 17.0952H10.6071V12.857C10.6071 11.9694 9.8876 11.2499 9 11.2499C8.11239 11.2499 7.39285 11.9694 7.39285 12.857V17.0952H4.93296C3.75495 17.0952 2.75307 16.2359 2.57378 15.0715C2.39334 13.8998 2.32877 12.7146 2.3802 11.5329H1.49119C0.477176 11.5329 -0.137765 10.4139 0.405866 9.55791L0.678155 9.12917C2.35639 6.48667 4.49195 4.16426 6.98474 2.27077L7.83349 1.62608Z" fill="#F4F7FA"/>
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

// Sales icons (default and active)
function IconSalesDefault(_props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M11.2545 0.0509033C11.6762 0.050903 12.0308 0.0501332 12.3218 0.0802002C12.6244 0.1115 12.9014 0.179115 13.1617 0.339966C13.422 0.500879 13.6067 0.718081 13.7701 0.974731C13.9271 1.22153 14.0845 1.53901 14.273 1.91614C14.2794 1.92901 14.2863 1.94279 14.2916 1.95618L15.3004 4.50598C15.4201 4.80869 15.551 5.18394 15.5894 5.56555C15.6285 5.95535 15.5739 6.39831 15.272 6.78137C15.0172 7.10444 14.6597 7.34287 14.2496 7.45227V14.4259H15.1871C15.4631 14.4259 15.6868 14.65 15.6871 14.9259C15.6871 15.202 15.4632 15.4259 15.1871 15.4259H0.812073C0.536131 15.4257 0.312073 15.2019 0.312073 14.9259C0.3123 14.6501 0.536271 14.4261 0.812073 14.4259H1.74957V7.45227C1.33958 7.34278 0.98272 7.10427 0.728088 6.78137C0.426037 6.39823 0.372546 5.95543 0.411682 5.56555C0.450077 5.18397 0.581005 4.80867 0.700745 4.50598L1.70953 1.95618L1.72711 1.91614C1.91567 1.53902 2.07398 1.22153 2.23102 0.974731C2.39423 0.718345 2.57833 0.500776 2.83844 0.339966C3.09871 0.179215 3.37583 0.111489 3.67828 0.0802002C3.96932 0.0501351 4.32394 0.0509031 4.74567 0.0509033H11.2545ZM12.313 6.87708C11.9585 7.27044 11.4468 7.51949 10.8755 7.51965C10.3043 7.51965 9.79266 7.2704 9.43805 6.87708C9.08354 7.27044 8.57176 7.51949 8.00055 7.51965C7.42925 7.51965 6.91766 7.2704 6.56305 6.87708C6.20854 7.27044 5.69675 7.51949 5.12555 7.51965C4.55427 7.51965 4.04267 7.27041 3.68805 6.87708C3.44091 7.15131 3.11636 7.35277 2.74957 7.45129V14.4259H5.7027V12.4103C5.7027 12.0838 5.70264 11.8052 5.72321 11.5782C5.74441 11.3446 5.79032 11.1162 5.91364 10.9025H5.91461C6.05303 10.6629 6.2521 10.4637 6.49176 10.3253L6.65485 10.2462C6.82002 10.1801 6.99226 10.1498 7.16754 10.1339C7.39446 10.1133 7.67311 10.1134 7.99957 10.1134C8.326 10.1134 8.60468 10.1134 8.8316 10.1339C9.06532 10.1551 9.29365 10.202 9.50739 10.3253L9.67926 10.4396C9.84285 10.5651 9.98069 10.7228 10.0845 10.9025L10.1636 11.0656C10.2298 11.2307 10.26 11.403 10.2759 11.5782C10.2965 11.8052 10.2964 12.0838 10.2964 12.4103V14.4259H13.2496V7.45032C12.8835 7.35161 12.5599 7.15084 12.313 6.87708ZM7.99957 11.1134C7.65473 11.1134 7.42872 11.1135 7.25739 11.129C7.17544 11.1365 7.118 11.1475 7.07672 11.1583L6.99176 11.1906C6.92602 11.2285 6.86785 11.2791 6.82184 11.339L6.77985 11.4025C6.75892 11.4388 6.73322 11.5043 6.71832 11.6681C6.70279 11.8394 6.7027 12.0654 6.7027 12.4103V14.4259H9.29645V12.4103C9.29645 12.0654 9.29635 11.8394 9.28082 11.6681C9.27337 11.5862 9.26238 11.5287 9.25153 11.4874L9.2193 11.4025C9.18133 11.3368 9.13063 11.2784 9.07086 11.2325L9.00739 11.1906C8.97097 11.1697 8.90513 11.1439 8.74176 11.129C8.57041 11.1135 8.34435 11.1134 7.99957 11.1134ZM4.74567 1.0509C4.30377 1.0509 4.0096 1.05183 3.7818 1.07532C3.56594 1.09764 3.45166 1.13703 3.36481 1.19055C3.27794 1.24424 3.19142 1.32861 3.07477 1.51184C2.95382 1.70192 2.82284 1.95912 2.63043 2.34387L1.63043 4.87415C1.51723 5.1603 1.42972 5.42813 1.40582 5.66516C1.38284 5.89402 1.42316 6.0479 1.51324 6.16223C1.68573 6.38095 1.95204 6.51965 2.25055 6.51965C2.76807 6.51935 3.18805 6.09975 3.18805 5.58215C3.18829 5.30621 3.41205 5.08215 3.68805 5.08215C3.96379 5.08245 4.18781 5.3064 4.18805 5.58215C4.18805 6.09994 4.60778 6.51965 5.12555 6.51965C5.64307 6.51935 6.06305 6.09975 6.06305 5.58215C6.06329 5.30621 6.28705 5.08215 6.56305 5.08215C6.83879 5.08245 7.06281 5.3064 7.06305 5.58215C7.06305 6.09994 7.48276 6.51965 8.00055 6.51965C8.51808 6.51935 8.93805 6.09976 8.93805 5.58215C8.93829 5.30621 9.16205 5.08215 9.43805 5.08215C9.71379 5.08245 9.93781 5.3064 9.93805 5.58215C9.93805 6.09994 10.3578 6.51965 10.8755 6.51965C11.3931 6.51935 11.813 6.09976 11.813 5.58215C11.8133 5.30621 12.0371 5.08215 12.313 5.08215C12.5888 5.08245 12.8128 5.3064 12.813 5.58215C12.813 6.09994 13.2328 6.51965 13.7505 6.51965C14.0488 6.51948 14.3145 6.38068 14.4869 6.16223C14.5768 6.04792 14.6173 5.89385 14.5943 5.66516C14.5704 5.42814 14.4829 5.1603 14.3697 4.87415L13.3687 2.34387C13.1765 1.95945 13.0472 1.70184 12.9263 1.51184C12.8096 1.32846 12.7232 1.24427 12.6363 1.19055C12.5494 1.13684 12.4355 1.0977 12.2193 1.07532C11.9914 1.05175 11.6968 1.0509 11.2545 1.0509H4.74567Z" fill="#282F43"/>
</svg>

  );
}

function IconSalesActive(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M10.4997 6.92545C10.8304 7.1561 11.2329 7.29166 11.6667 7.29166V12.3961H12.8337C13.0751 12.3963 13.2712 12.5921 13.2712 12.8336C13.271 13.075 13.075 13.271 12.8337 13.2711H1.16669C0.925187 13.2711 0.729385 13.0751 0.729187 12.8336C0.729187 12.592 0.925065 12.3961 1.16669 12.3961H2.33368V7.29166C2.76729 7.29159 3.1691 7.15599 3.49969 6.92545C3.8304 7.1561 4.23291 7.29166 4.66669 7.29166C5.10047 7.29166 5.50298 7.1561 5.83368 6.92545C6.16427 7.15599 6.5661 7.29159 6.99969 7.29166C7.43346 7.29166 7.836 7.1561 8.16669 6.92545C8.49738 7.1561 8.89991 7.29166 9.33368 7.29166C9.76728 7.29159 10.1691 7.15599 10.4997 6.92545ZM6.99969 9.33365C6.45473 9.33365 6.1822 9.33361 5.97919 9.45084C5.84625 9.5276 5.73565 9.63819 5.65887 9.77115C5.54182 9.97418 5.54169 10.2467 5.54169 10.7917V12.3961H8.45868V10.7917C8.45868 10.2469 8.45849 9.97416 8.34149 9.77115C8.2648 9.63827 8.15401 9.52759 8.02118 9.45084C7.81812 9.33359 7.54488 9.33365 6.99969 9.33365ZM9.6413 1.16666C10.3425 1.16666 10.6934 1.16652 10.9753 1.34048C11.2572 1.51473 11.4144 1.82913 11.7282 2.4567L12.5466 4.52603C12.7357 5.00423 12.9021 5.56851 12.5837 5.97232C12.3701 6.24317 12.0385 6.41664 11.6667 6.41666C11.0224 6.41666 10.4997 5.89401 10.4997 5.24966C10.4997 5.89389 9.97786 6.41646 9.33368 6.41666C8.68939 6.41666 8.16669 5.89401 8.16669 5.24966C8.16669 5.89401 7.64404 6.41666 6.99969 6.41666C6.35553 6.4165 5.83368 5.89392 5.83368 5.24966C5.83368 5.89401 5.31101 6.41664 4.66669 6.41666C4.02235 6.41666 3.49969 5.89401 3.49969 5.24966C3.49969 5.8939 2.97785 6.41647 2.33368 6.41666C1.96201 6.41666 1.63032 6.24308 1.41669 5.97232C1.09826 5.56851 1.26365 5.00423 1.45282 4.52603L2.27216 2.4567C2.58593 1.82915 2.7422 1.51473 3.02411 1.34048C3.30604 1.16624 3.65742 1.16666 4.35907 1.16666H9.6413Z" fill="#FEF2F2"/>
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
    { label: t('home'), to: '/', icon: <span /> },
    { label: t('sales'), to: '/dashboard', icon: <span /> },
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
            const iconEl =
              it.to === '/'
                ? active
                  ? <IconHomeActive className="h-5 w-5" />
                  : <IconHomeDefault className="h-5 w-5" />
                : it.to === '/dashboard'
                  ? active
                    ? <IconSalesActive className="h-5 w-5" />
                    : <IconSalesDefault className="h-5 w-5" />
                  : it.icon;
            return (
              <li key={it.label}>
                <Link
                  to={it.to}
                  title={collapsed ? it.label : undefined}
                  className={
                    `flex items-center gap-3 rounded-lg px-3 py-2 text-sm max-w-[200px] h-[50px] ` +
                    `${active ? 'bg-[#526BA3] text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`
                  }
                >
                  <span className="text-gray-500">{iconEl}</span>
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
