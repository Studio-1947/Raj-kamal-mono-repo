import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLang } from "../modules/lang/LangContext";
import { useLogout } from "../services/authService";
import { useAuth } from "../modules/auth/AuthContext";
import {
  IconHomeDefault,
  IconHomeActive,
  IconSalesDefault,
  IconSalesActive,
  IconInventoryDefault,
  IconInventoryActive,
  IconRankingsDefault,
  IconRankingsActive,
  IconSettingsDefault,
  IconLanguageDefault,
  IconSocialDefault,
  IconSocialActive,
  IconUser,
  IconChevron,
  IconCheck,
  IconChevronDown,
} from "./icons/SidebarIcons";

import { RajkamalLogo } from "./RajkamalLogo";

type Item = {
  label: string;
  to: string;
  icon: JSX.Element;
  disabled?: boolean;
};

function LangMenuItems({ onSelect }: { onSelect: () => void }) {
  const { lang, setLang, t } = useLang();
  const entry = (key: "en" | "hi", label: string) => (
    <button
      key={key}
      onClick={() => {
        setLang(key);
        onSelect();
      }}
      className={
        "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-normal hover:bg-gray-50 " +
        (lang === key ? "text-gray-900" : "text-gray-600")
      }
    >
      <span>{label}</span>
      {lang === key && <IconCheck className="h-4 w-4 text-green-600" />}
    </button>
  );
  return (
    <div className="space-y-1">
      {entry("en", t("english"))}
      {entry("hi", t("hindi"))}
    </div>
  );
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { t } = useLang();
  const navigate = useNavigate();
  const { logout: clientLogout, user } = useAuth();
  const logoutMutation = useLogout();

  function handleLogout() {
    clientLogout();
    setOpenMenu(null);
    navigate("/login", { replace: true });
    logoutMutation.mutate();
  }

  const items: Item[] = [
    { label: t("home"), to: "/", icon: <span /> },
    { label: "Delhi Offline", to: "/offline-sheet-sales", icon: <span /> },
    { label: "Mumbai Offline", to: "/mumbai-offline-sales", icon: <span /> },
    { label: "Patna Offline", to: "/patna-offline-sales", icon: <span /> },
    { label: "Online - Website", to: "/online-offline-sales", icon: <span /> },
    { label: "BookFair Offline", to: "/bookfair-offline-sales", icon: <span /> },
    { label: "Lokbharti - Allahabad", to: "/lokbharti-offline-sales", icon: <span /> },
    { label: t("geo_insights"), to: "/geo-insights", icon: <span /> },
    { label: t("rankings"), to: "/rankings", icon: <span />, disabled: true },
  ];

  const [openMenu, setOpenMenu] = useState<null | "amod" | "settings" | "lang">(null);

  const amodRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !amodRef.current?.contains(t) &&
        !settingsRef.current?.contains(t) &&
        !langRef.current?.contains(t)
      ) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // Helper: resolve correct icon for each nav item
  function resolveIcon(it: Item, active: boolean) {
    if (it.to === "/") return active ? <IconHomeActive className="h-5 w-5" /> : <IconHomeDefault className="h-5 w-5" />;
    if (it.to === "/offline-sheet-sales") return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
    if (["/mumbai-offline-sales", "/patna-offline-sales", "/online-offline-sales", "/bookfair-offline-sales", "/lokbharti-offline-sales"].includes(it.to)) return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
    if (it.to === "/geo-insights") return (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15 15 0 010 18 15 15 0 010-18z" />
      </svg>
    );
    if (it.to === "/dashboard") return active ? <IconSalesActive className="h-5 w-5" /> : <IconSalesDefault className="h-5 w-5" />;
    if (it.to === "/stock") return active ? <IconInventoryActive className="h-5 w-5" /> : <IconInventoryDefault className="h-5 w-5" />;
    if (it.to === "/rankings") return active ? <IconRankingsActive className="h-5 w-5" /> : <IconRankingsDefault className="h-5 w-5" />;
    if (it.to === "/social") return active ? <IconSocialActive className="h-5 w-5" /> : <IconSocialDefault className="h-5 w-5" />;
    return it.icon;
  }

  return (
    <aside
      className={
        `relative flex h-full flex-col border-r border-gray-200 bg-white/90 backdrop-blur rounded-3xl overflow-visible ` +
        `transition-[width] duration-300 ease-in-out ${collapsed ? "w-[72px]" : "w-64"}`
      }
    >
      {/* ── Logo ── */}
      <div className={`flex items-center py-3 ${collapsed ? "justify-center px-0" : "px-4 gap-2"}`}>
        <RajkamalLogo
          className={collapsed ? "" : "gap-2"}
          showWordmark={!collapsed}
          emblemWrapperClassName={collapsed ? "h-10 w-10" : "h-12 w-12"}
          wordmarkClassName="h-9"
        />
      </div>

      {/* ── Nav ── */}
      <nav className="flex-1 flex flex-col overflow-hidden min-h-0 px-2 mt-1">
        {/* Scrollable nav list — scrollbar hidden via inline style */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          <ul className={`${collapsed ? "space-y-0.5" : "space-y-0.5"}`}>
            {items.map((it) => {
              const [itPath, itSearch] = it.to.split('?');
              const active = location.pathname === itPath &&
                (!itSearch || location.search === `?${itSearch}`);
              const iconEl = resolveIcon(it, active);

              return (
                <li key={it.label} className={it.disabled ? "cursor-not-allowed" : ""}>
                  <Link
                    to={it.disabled ? "#" : it.to}
                    onClick={(e) => it.disabled && e.preventDefault()}
                    title={it.label} // always show tooltip on hover (helpful in both states)
                    className={
                      "flex items-center text-sm font-normal transition-all duration-150 " +
                      (it.disabled ? "opacity-40 pointer-events-none " : "") +
                      (!collapsed
                        ? // ── Expanded ──
                          `gap-3 rounded-xl px-3 py-2.5 ${
                            active
                              ? "bg-[#526BA3] text-white"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }`
                        : // ── Collapsed: perfectly centered icon circle ──
                          `flex justify-center items-center w-10 h-10 mx-auto rounded-xl ${
                            active
                              ? "bg-[#526BA3] text-white"
                              : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                          }`)
                    }
                  >
                    <span className={`shrink-0 ${active ? "text-white" : "text-gray-500"} ${collapsed && active ? "text-white" : ""}`}>
                      {iconEl}
                    </span>
                    {!collapsed && <span className="truncate">{it.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* ── Divider ── */}
        <div className="my-3 h-px w-full bg-gray-100 shrink-0" />

        {/* ── Bottom: Account, Settings, Language ── */}
        <div className="shrink-0 pb-1 space-y-0.5">

          {/* Account button */}
          <div ref={amodRef} className="relative">
            <button
              onClick={() => setOpenMenu((v) => (v === "amod" ? null : "amod"))}
              title={user?.name || "Account"}
              className={
                !collapsed
                  ? "flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100 transition-colors"
                  : "flex mx-auto w-10 h-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
              }
            >
              <div className={`flex items-center justify-center rounded-full bg-rose-100 text-rose-600 ${collapsed ? "h-6 w-6" : "h-7 w-7 shrink-0"}`}>
                <IconUser className="h-3.5 w-3.5" />
              </div>
              {!collapsed && (
                <>
                  <span className="text-sm font-normal truncate flex-1 text-left">{user?.name || "Account"}</span>
                  <IconChevronDown
                    className={`h-4 w-4 shrink-0 transition-transform ${openMenu === "amod" ? "rotate-180" : ""}`}
                  />
                </>
              )}
            </button>
            {/* Expanded: inline accordion */}
            {!collapsed && (
              <div className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${openMenu === "amod" ? "max-h-40" : "max-h-0"}`}>
                <div className="mt-1.5 rounded-xl border border-gray-100 bg-white shadow-sm p-1">
                  <Link
                    to="/settings"
                    onClick={() => setOpenMenu(null)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-normal text-gray-700 hover:bg-gray-50"
                  >
                    <IconSettingsDefault className="h-4 w-4" />
                    <span>My Account</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="mt-0.5 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-normal text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )}
            {/* Collapsed: popover */}
            {collapsed && openMenu === "amod" && (
              <div className="absolute left-full top-0 z-50 ml-3 w-52 rounded-2xl border border-gray-100 bg-white shadow-xl p-1.5">
                <p className="px-3 py-1.5 text-xs font-normal text-gray-400 uppercase tracking-wider">{user?.name || "Account"}</p>
                <Link
                  to="/settings"
                  onClick={() => setOpenMenu(null)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-normal text-gray-700 hover:bg-gray-50"
                >
                  <IconSettingsDefault className="h-4 w-4" />
                  <span>My Account</span>
                </Link>
                <button
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="mt-0.5 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-normal text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* Settings */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setOpenMenu((v) => (v === "settings" ? null : "settings"))}
              title={t("settings")}
              className={
                "flex items-center text-sm font-normal transition-all duration-150 " +
                (!collapsed
                  ? "w-full gap-3 rounded-xl px-3 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  : "w-10 h-10 mx-auto justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800")
              }
            >
              <span className="shrink-0 text-gray-500"><IconSettingsDefault className="h-5 w-5" /></span>
              {!collapsed && (
                <>
                  <span className="truncate flex-1 text-left">{t("settings")}</span>
                  <IconChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openMenu === "settings" ? "rotate-180" : ""}`} />
                </>
              )}
            </button>
            {!collapsed && (
              <div className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${openMenu === "settings" ? "max-h-48" : "max-h-0"}`}>
                <div className="mt-1.5 rounded-xl border border-gray-100 bg-white shadow-sm p-1">
                  <Link
                    to="/settings"
                    onClick={() => setOpenMenu(null)}
                    className="block rounded-lg px-3 py-2 text-sm font-normal text-gray-700 hover:bg-gray-50"
                  >
                    General
                  </Link>
                </div>
              </div>
            )}
            {collapsed && openMenu === "settings" && (
              <div className="absolute left-full top-0 z-50 ml-3 w-52 rounded-2xl border border-gray-100 bg-white shadow-xl p-1.5">
                <p className="px-3 py-1.5 text-xs font-normal text-gray-400 uppercase tracking-wider">{t("settings")}</p>
                <Link to="/settings" onClick={() => setOpenMenu(null)} className="block rounded-xl px-3 py-2 text-sm font-normal text-gray-700 hover:bg-gray-50">General</Link>
                <button onClick={() => setOpenMenu(null)} className="w-full text-left rounded-xl px-3 py-2 text-sm font-normal text-gray-700 hover:bg-gray-50">Theme</button>
                <button onClick={() => setOpenMenu(null)} className="w-full text-left rounded-xl px-3 py-2 text-sm font-normal text-gray-700 hover:bg-gray-50">Notifications</button>
              </div>
            )}
          </div>

          {/* Language */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setOpenMenu((v) => (v === "lang" ? null : "lang"))}
              title={t("language")}
              className={
                "flex items-center text-sm font-normal transition-all duration-150 " +
                (!collapsed
                  ? "w-full gap-3 rounded-xl px-3 py-2.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  : "w-10 h-10 mx-auto justify-center rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800")
              }
            >
              <span className="shrink-0 text-gray-500"><IconLanguageDefault className="h-5 w-5" /></span>
              {!collapsed && (
                <>
                  <span className="truncate flex-1 text-left">{t("language")}</span>
                  <IconChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openMenu === "lang" ? "rotate-180" : ""}`} />
                </>
              )}
            </button>
            {!collapsed && (
              <div className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${openMenu === "lang" ? "max-h-40" : "max-h-0"}`}>
                <div className="mt-1.5 rounded-xl border border-gray-100 bg-white shadow-sm p-1">
                  <div className="px-3 py-1 text-xs font-normal text-gray-400 uppercase tracking-wider">{t("select_language")}</div>
                  <LangMenuItems onSelect={() => setOpenMenu(null)} />
                </div>
              </div>
            )}
            {collapsed && openMenu === "lang" && (
              <div className="absolute left-full top-0 z-50 ml-3 w-52 rounded-2xl border border-gray-100 bg-white shadow-xl p-1.5">
                <p className="px-3 py-1.5 text-xs font-normal text-gray-400 uppercase tracking-wider">{t("select_language")}</p>
                <LangMenuItems onSelect={() => setOpenMenu(null)} />
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* ── Collapse Toggle ── */}
      <div className={`px-3 pb-4 pt-2 ${collapsed ? "flex justify-center" : ""}`}>
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={
            collapsed
              ? "flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors"
              : "flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 py-2 text-xs font-normal text-gray-600 hover:bg-gray-200 hover:text-gray-800 transition-colors"
          }
        >
          <IconChevron className={`h-4 w-4 transition-transform duration-300 ${collapsed ? "rotate-180" : ""}`} />
          {!collapsed && <span>{t("collapse")}</span>}
        </button>
      </div>
    </aside>
  );
}
