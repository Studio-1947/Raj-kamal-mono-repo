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
        "flex w-full items-center justify-between rounded-md px-2 py-2 text-sm hover:bg-gray-50 " +
        (lang === key ? "text-gray-900" : "text-gray-700")
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
  const { logout: clientLogout } = useAuth();
  const logoutMutation = useLogout();

  function handleLogout() {
    // Immediately clear client state and navigate
    clientLogout();
    setOpenMenu(null);
    navigate("/login", { replace: true });
    // Best-effort notify backend (no need to block UI)
    logoutMutation.mutate();
  }

  const items: Item[] = [
    { label: t("home"), to: "/", icon: <span /> },
    { label: t("sales"), to: "/dashboard", icon: <span /> },
    { label: t("geo_insights"), to: "/inventory", icon: <span /> },
    { label: t("rankings"), to: "/rankings", icon: <span /> },
    { label: t("social_media"), to: "/social", icon: <span /> },
  ];

  // Bottom menus handled explicitly (Amod, Settings, Language)

  const [openMenu, setOpenMenu] = useState<null | "amod" | "settings" | "lang">(
    null
  );

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

  return (
    <aside
      className={
        // Ensure a space between class groups so Tailwind utilities are parsed correctly
        `group relative flex h-full flex-col border-r border-gray-200 bg-white/90 backdrop-blur rounded-3xl overflow-visible ` +
        `transition-[width] duration-300 ease-in-out ${
          collapsed ? "w-[72px]" : "w-64"
        }`
      }
    >
      <div className="flex items-center justify-between px-3 py-3">
        <RajkamalLogo
          className="gap-2"
          showWordmark={!collapsed}
          emblemWrapperClassName="h-14 w-14"
          wordmarkClassName="h-10"
        />
        {/* <button
          aria-label={collapsed ? t('expand') + ' sidebar' : t('collapse') + ' sidebar'}
          className="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200"
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? t('expand') : t('collapse')}
        >
          <div className={`transition-transform ${collapsed ? 'rotate-180' : ''}`}>
            <IconChevron className="h-4 w-4" />
          </div>
        </button> */}
      </div>

      <nav className="mt-2 flex-1 px-2 flex flex-col overflow-hidden min-h-0">
        <div className="flex-1 overflow-y-auto pr-1">
          <ul className="space-y-1">
            {items.map((it) => {
              const active = location.pathname === it.to;
              const iconEl =
                it.to === "/" ? (
                  active ? (
                    <IconHomeActive className="h-5 w-5" />
                  ) : (
                    <IconHomeDefault className="h-5 w-5" />
                  )
                ) : it.to === "/dashboard" ? (
                  active ? (
                    <IconSalesActive className="h-5 w-5" />
                  ) : (
                    <IconSalesDefault className="h-5 w-5" />
                  )
                ) : it.to === "/inventory" ? (
                  active ? (
                    <IconInventoryActive className="h-5 w-5" />
                  ) : (
                    <IconInventoryDefault className="h-5 w-5" />
                  )
                ) : it.to === "/rankings" ? (
                  active ? (
                    <IconRankingsActive className="h-5 w-5" />
                  ) : (
                    <IconRankingsDefault className="h-5 w-5" />
                  )
                ) : it.to === "/social" ? (
                  active ? (
                    <IconSocialActive className="h-5 w-5" />
                  ) : (
                    <IconSocialDefault className="h-5 w-5" />
                  )
                ) : (
                  it.icon
                );
              return (
                <li key={it.label}>
                  <Link
                    to={it.to}
                    title={collapsed ? it.label : undefined}
                    className={
                      // Common
                      "flex items-center text-sm transition-all " +
                      // Expanded styles
                      (!collapsed
                        ? `gap-3 rounded-lg px-3 py-2 h-[50px] max-w-[200px] ${
                            active
                              ? "bg-[#526BA3] text-white"
                              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                          }`
                        : // Collapsed styles
                          `${
                            active
                              ? // active -> centered circle
                                "mx-auto justify-center rounded-full bg-[#526BA3] text-white w-11 h-11"
                              : // inactive -> centered icon, no pill
                                "mx-auto justify-center rounded-lg w-11 h-11 text-gray-600 hover:text-gray-900"
                          }`)
                    }
                  >
                    <span className={active ? "text-white" : "text-gray-500"}>
                      {iconEl}
                    </span>
                    {!collapsed && <span className="truncate">{it.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="my-4 h-px w-full bg-gray-100 shrink-0" />

        {/* Account (Amod) menu */}
        <div className="mt-auto shrink-0">
          <div ref={amodRef} className="relative">
            <button
              onClick={() => setOpenMenu((v) => (v === "amod" ? null : "amod"))}
              title={collapsed ? "Account" : undefined}
              className={
                !collapsed
                  ? "flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 hover:bg-rose-100"
                  : "flex mx-auto w-11 h-11 items-center justify-center rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100"
              }
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <IconUser className="h-4 w-4" />
              </div>
              {!collapsed && (
                <>
                  <span className="text-sm">Amod M.</span>
                  <IconChevronDown
                    className={`ml-auto h-4 w-4 transition-transform ${
                      openMenu === "amod" ? "rotate-180" : ""
                    }`}
                  />
                </>
              )}
            </button>
            {/* Expanded: inline accordion, Collapsed: popover */}
            {(!collapsed && (
              <div
                className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${
                  openMenu === "amod" ? "max-h-40" : "max-h-0"
                }`}
              >
                <div className="mt-2 rounded-lg border border-gray-200 bg-white p-1">
                  <Link
                    to="/settings"
                    onClick={() => setOpenMenu(null)}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <IconSettingsDefault className="h-4 w-4" />
                    <span>My Account</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <span>Logout</span>
                  </button>
                </div>
              </div>
            )) ||
              (collapsed && openMenu === "amod" && (
                <div className="absolute left-full top-0 z-50 ml-2 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                  <Link
                    to="/settings"
                    onClick={() => setOpenMenu(null)}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <IconSettingsDefault className="h-4 w-4" />
                    <span>My Account</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    disabled={logoutMutation.isPending}
                    className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    <span>Logout</span>
                  </button>
                </div>
              ))}
          </div>

          {/* Settings and Language as menus */}
          <ul className="mt-4 space-y-1">
            <li>
              <div ref={settingsRef} className="relative">
                <button
                  onClick={() =>
                    setOpenMenu((v) => (v === "settings" ? null : "settings"))
                  }
                  title={collapsed ? t("settings") : undefined}
                  className={
                    "flex items-center text-sm transition-all " +
                    (!collapsed
                      ? "w-full gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      : "mx-auto justify-center rounded-lg w-11 h-11 text-gray-600 hover:text-gray-900")
                  }
                >
                  <span className="text-gray-500">
                    <IconSettingsDefault className="h-5 w-5" />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="truncate">{t("settings")}</span>
                      <IconChevronDown
                        className={`ml-auto h-4 w-4 transition-transform ${
                          openMenu === "settings" ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </button>
                {(!collapsed && (
                  <div
                    className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${
                      openMenu === "settings" ? "max-h-48" : "max-h-0"
                    }`}
                  >
                    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-1">
                      <Link
                        to="/settings"
                        onClick={() => setOpenMenu(null)}
                        className="block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        General
                      </Link>
                    </div>
                  </div>
                )) ||
                  (collapsed && openMenu === "settings" && (
                    <div className="absolute left-full top-0 z-50 ml-2 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                      <Link
                        to="/settings"
                        onClick={() => setOpenMenu(null)}
                        className="block rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        General
                      </Link>
                      <button
                        onClick={() => setOpenMenu(null)}
                        className="w-full text-left rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Theme
                      </button>
                      <button
                        onClick={() => setOpenMenu(null)}
                        className="w-full text-left rounded-md px-2 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Notifications
                      </button>
                    </div>
                  ))}
              </div>
            </li>
            <li>
              <div ref={langRef} className="relative">
                <button
                  onClick={() =>
                    setOpenMenu((v) => (v === "lang" ? null : "lang"))
                  }
                  title={collapsed ? t("language") : undefined}
                  className={
                    "flex items-center text-sm transition-all " +
                    (!collapsed
                      ? "w-full gap-3 rounded-lg px-3 py-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      : "mx-auto justify-center rounded-lg w-11 h-11 text-gray-600 hover:text-gray-900")
                  }
                >
                  <span className="text-gray-500">
                    <IconLanguageDefault className="h-5 w-5" />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="truncate">{t("language")}</span>
                      <IconChevronDown
                        className={`ml-auto h-4 w-4 transition-transform ${
                          openMenu === "lang" ? "rotate-180" : ""
                        }`}
                      />
                    </>
                  )}
                </button>
                {(!collapsed && (
                  <div
                    className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${
                      openMenu === "lang" ? "max-h-40" : "max-h-0"
                    }`}
                  >
                    <div className="mt-2 rounded-lg border border-gray-200 bg-white p-1">
                      <div className="px-2 py-1 text-xs font-medium text-gray-500">
                        {t("select_language")}
                      </div>
                      <LangMenuItems onSelect={() => setOpenMenu(null)} />
                    </div>
                  </div>
                )) ||
                  (collapsed && openMenu === "lang" && (
                    <div className="absolute left-full top-0 z-50 ml-2 w-56 rounded-lg border border-gray-200 bg-white p-1 shadow-lg">
                      <div className="px-2 py-1 text-xs font-medium text-gray-500">
                        {t("select_language")}
                      </div>
                      <LangMenuItems onSelect={() => setOpenMenu(null)} />
                    </div>
                  ))}
              </div>
            </li>
          </ul>
        </div>
      </nav>

      <div className="mt-auto px-3 pb-3">
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand" : "Collapse"}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gray-100 py-2 text-xs text-gray-600 hover:bg-gray-200"
        >
          <IconChevron
            className={`h-4 w-4 transition-transform ${
              collapsed ? "rotate-180" : ""
            }`}
          />
          {!collapsed && <span>{t("collapse")}</span>}
        </button>
      </div>
    </aside>
  );
}
