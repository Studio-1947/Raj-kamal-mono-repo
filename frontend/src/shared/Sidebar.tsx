import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLang } from "../modules/lang/LangContext";
import { useLogout } from "../services/authService";
import { useAuth } from "../modules/auth/AuthContext";
import {
  IconSettingsDefault,
  IconLanguageDefault,
  IconUser,
  IconCheck,
  IconChevronDown,
} from "./icons/SidebarIcons";

import { RajkamalLogo } from "./RajkamalLogo";

// ── Active state colour (per design spec) ──
const ACTIVE = "#0067B5";

// ── Small inline icon set (logos beside menu items) ──
type IconProps = React.SVGProps<SVGSVGElement>;
const svg = (path: React.ReactNode) => (p: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4"
    {...p}
  >
    {path}
  </svg>
);

const IconHome = svg(<path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />);
const IconStore = svg(<><path d="M4 9h16l-1-5H5L4 9Z" /><path d="M5 9v11h14V9" /><path d="M9 20v-6h6v6" /></>);
const IconGlobe = svg(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18 15 15 0 0 1 0-18Z" /></>);
const IconBook = svg(<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Zm0 0v14M18 16H7" />);
const IconPin = svg(<><path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" /><circle cx="12" cy="10" r="2.5" /></>);
const IconChat = svg(<path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.8-5.5A8 8 0 1 1 21 12Z" />);
const IconBag = svg(<><path d="M6 7h12l1 13H5L6 7Z" /><path d="M9 7a3 3 0 0 1 6 0" /></>);
const IconMap = svg(<><path d="m9 4 6 2 5-2v14l-5 2-6-2-5 2V6l5-2Z" /><path d="M9 4v14M15 6v14" /></>);
const IconSocial = svg(<><circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="17" cy="18" r="2.5" /><path d="m8.2 10.8 6.6-3.6M8.2 13.2l6.6 3.6" /></>);

type Leaf = {
  label: string;
  to: string;
  icon: (p: IconProps) => JSX.Element;
  disabled?: boolean;
};

type NavNode =
  | { kind: "item"; label: string; to: string; icon: (p: IconProps) => JSX.Element; disabled?: boolean }
  | { kind: "group"; title: string; icon: (p: IconProps) => JSX.Element; items: Leaf[] };

// ── Sidebar navigation tree (always-open, non-collapsible) ──
const TREE: NavNode[] = [
  { kind: "item", label: "Total", to: "/", icon: IconHome },
  {
    kind: "group",
    title: "Offline Data",
    icon: IconStore,
    items: [
      { label: "Delhi", to: "/offline-sheet-sales", icon: IconPin },
      { label: "Mumbai", to: "/mumbai-offline-sales", icon: IconPin },
      { label: "Patna", to: "/patna-offline-sales", icon: IconPin },
      { label: "Lokbharti", to: "/lokbharti-offline-sales", icon: IconPin },
    ],
  },
  {
    kind: "group",
    title: "Online Data",
    icon: IconGlobe,
    items: [
      { label: "Website", to: "/online-offline-sales", icon: IconGlobe },
      { label: "WhatsApp", to: "#", icon: IconChat, disabled: true },
      { label: "Amazon", to: "#", icon: IconBag, disabled: true },
      { label: "Flipkart", to: "#", icon: IconBag, disabled: true },
    ],
  },
  {
    kind: "group",
    title: "BookFair",
    icon: IconBook,
    items: [
      { label: "Delhi", to: "/bookfair-offline-sales", icon: IconPin },
    ],
  },
];

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
  const location = useLocation();
  const { t } = useLang();
  const navigate = useNavigate();
  const { logout: clientLogout, user } = useAuth();
  const logoutMutation = useLogout();

  const [openMenu, setOpenMenu] = useState<null | "amod" | "settings" | "lang">(null);

  const amodRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const langRef = useRef<HTMLDivElement | null>(null);

  function handleLogout() {
    clientLogout();
    setOpenMenu(null);
    navigate("/login", { replace: true });
    logoutMutation.mutate();
  }

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as globalThis.Node;
      if (
        !amodRef.current?.contains(target) &&
        !settingsRef.current?.contains(target) &&
        !langRef.current?.contains(target)
      ) {
        setOpenMenu(null);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // A leaf/item is active when its path (and optional query) matches the URL.
  function isActive(to: string) {
    const [path, search] = to.split("?");
    return location.pathname === path && (!search || location.search === `?${search}`);
  }

  // ── Top-level item (e.g. "Total") ──
  function TopItem({ label, to, icon: Icon, disabled }: { label: string; to: string; icon: (p: IconProps) => JSX.Element; disabled?: boolean }) {
    const active = isActive(to);
    return (
      <Link
        to={disabled ? "#" : to}
        onClick={(e) => disabled && e.preventDefault()}
        title={label}
        style={active ? { color: ACTIVE } : undefined}
        className={
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
          (disabled ? "opacity-40 pointer-events-none " : "") +
          (active
            ? "bg-[#0067B5]/10"
            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900")
        }
      >
        {active && <span className="shrink-0 text-base leading-none" aria-hidden>→</span>}
        <Icon className={"h-4 w-4 shrink-0 " + (active ? "" : "text-gray-400")} />
        <span className="truncate">{label}</span>
      </Link>
    );
  }

  // ── Indented leaf inside a group ──
  function LeafItem({ leaf }: { leaf: Leaf }) {
    const active = isActive(leaf.to);
    const Icon = leaf.icon;
    return (
      <Link
        to={leaf.disabled ? "#" : leaf.to}
        onClick={(e) => leaf.disabled && e.preventDefault()}
        title={leaf.label}
        style={active ? { color: ACTIVE } : undefined}
        className={
          "group/leaf flex items-center gap-2 rounded-lg py-1.5 pl-6 pr-3 text-sm transition-colors " +
          (leaf.disabled ? "opacity-40 pointer-events-none " : "") +
          (active
            ? "bg-[#0067B5]/10 font-medium"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")
        }
      >
        {active && <span className="shrink-0 text-base leading-none" aria-hidden>→</span>}
        <Icon className={"h-4 w-4 shrink-0 " + (active ? "" : "text-gray-400")} />
        <span className="truncate">{leaf.label}</span>
      </Link>
    );
  }

  return (
    <aside className="relative flex h-full w-64 flex-col rounded-3xl border border-gray-200 bg-white/90 backdrop-blur">
      {/* ── Logo ── */}
      <div className="flex items-center gap-2 px-4 py-3">
        <RajkamalLogo
          className="gap-2"
          showWordmark
          emblemWrapperClassName="h-12 w-12"
          wordmarkClassName="h-9"
        />
      </div>

      {/* ── Nav ── */}
      <nav className="flex min-h-0 flex-1 flex-col px-2 mt-1">
        {/* Scrollable tree — scrollbar hidden */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          <div className="rounded-2xl border border-gray-100 p-2 space-y-1">
            {TREE.map((node) =>
              node.kind === "item" ? (
                <TopItem key={node.label} label={node.label} to={node.to} icon={node.icon} disabled={node.disabled} />
              ) : (
                <div key={node.title} className="pt-2">
                  {/* Section header — static, non-collapsible */}
                  <div className="flex items-center gap-2 px-3 pb-1 text-xs font-semibold tracking-wide text-gray-500">
                    <node.icon className="h-4 w-4 shrink-0 text-gray-400" />
                    <span>{node.title}</span>
                  </div>
                  {/* Sub-items — always visible */}
                  <div className="relative space-y-0.5">
                    {/* vertical tree guide line */}
                    <span className="pointer-events-none absolute left-3 top-1 bottom-1 w-px bg-gray-100" aria-hidden />
                    {node.items.map((leaf) => (
                      <LeafItem key={node.title + leaf.label} leaf={leaf} />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>

          {/* ── Standalone sections (boxed, like mockup) ── */}
          <div className="mt-3 space-y-2">
            <Link
              to="/geo-insights"
              style={isActive("/geo-insights") ? { color: ACTIVE, borderColor: ACTIVE } : undefined}
              className={
                "flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors " +
                (isActive("/geo-insights")
                  ? "bg-[#0067B5]/10 border-[#0067B5]"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50")
              }
            >
              {isActive("/geo-insights") && <span className="shrink-0 text-base leading-none" aria-hidden>→</span>}
              <IconMap className={"h-4 w-4 shrink-0 " + (isActive("/geo-insights") ? "" : "text-gray-400")} />
              {t("geo_insights")}
            </Link>
            <Link
              to="/social"
              style={isActive("/social") ? { color: ACTIVE, borderColor: ACTIVE } : undefined}
              className={
                "flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-medium transition-colors " +
                (isActive("/social")
                  ? "bg-[#0067B5]/10 border-[#0067B5]"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50")
              }
            >
              {isActive("/social") && <span className="shrink-0 text-base leading-none" aria-hidden>→</span>}
              <IconSocial className={"h-4 w-4 shrink-0 " + (isActive("/social") ? "" : "text-gray-400")} />
              {t("social_media")}
            </Link>
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="my-3 h-px w-full shrink-0 bg-gray-100" />

        {/* ── Bottom: Account, Settings, Language ── */}
        <div className="shrink-0 space-y-0.5 pb-1">
          {/* Account button */}
          <div ref={amodRef} className="relative">
            <button
              onClick={() => setOpenMenu((v) => (v === "amod" ? null : "amod"))}
              title={user?.name || "Account"}
              className="flex w-full items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 transition-colors hover:bg-rose-100"
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                <IconUser className="h-3.5 w-3.5" />
              </div>
              <span className="flex-1 truncate text-left text-sm font-normal">{user?.name || "Account"}</span>
              <IconChevronDown
                className={`h-4 w-4 shrink-0 transition-transform ${openMenu === "amod" ? "rotate-180" : ""}`}
              />
            </button>
            <div className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${openMenu === "amod" ? "max-h-40" : "max-h-0"}`}>
              <div className="mt-1.5 rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
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
          </div>

          {/* Settings */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setOpenMenu((v) => (v === "settings" ? null : "settings"))}
              title={t("settings")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-normal text-gray-600 transition-all duration-150 hover:bg-gray-100 hover:text-gray-900"
            >
              <span className="shrink-0 text-gray-500"><IconSettingsDefault className="h-5 w-5" /></span>
              <span className="flex-1 truncate text-left">{t("settings")}</span>
              <IconChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openMenu === "settings" ? "rotate-180" : ""}`} />
            </button>
            <div className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${openMenu === "settings" ? "max-h-48" : "max-h-0"}`}>
              <div className="mt-1.5 rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
                <Link
                  to="/settings"
                  onClick={() => setOpenMenu(null)}
                  className="block rounded-lg px-3 py-2 text-sm font-normal text-gray-700 hover:bg-gray-50"
                >
                  General
                </Link>
              </div>
            </div>
          </div>

          {/* Language */}
          <div ref={langRef} className="relative">
            <button
              onClick={() => setOpenMenu((v) => (v === "lang" ? null : "lang"))}
              title={t("language")}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-normal text-gray-600 transition-all duration-150 hover:bg-gray-100 hover:text-gray-900"
            >
              <span className="shrink-0 text-gray-500"><IconLanguageDefault className="h-5 w-5" /></span>
              <span className="flex-1 truncate text-left">{t("language")}</span>
              <IconChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openMenu === "lang" ? "rotate-180" : ""}`} />
            </button>
            <div className={`overflow-hidden transition-[max-height] duration-200 ease-in-out ${openMenu === "lang" ? "max-h-40" : "max-h-0"}`}>
              <div className="mt-1.5 rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
                <div className="px-3 py-1 text-xs font-normal uppercase tracking-wider text-gray-400">{t("select_language")}</div>
                <LangMenuItems onSelect={() => setOpenMenu(null)} />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}
