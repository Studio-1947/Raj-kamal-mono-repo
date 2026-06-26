import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useLang } from "../modules/lang/LangContext";
import { useLogout } from "../services/authService";
import { useAuth } from "../modules/auth/AuthContext";
import { IconSettingsDefault } from "./icons/SidebarIcons";

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
const IconArrowLeft = svg(<path d="M19 12H5M11 6l-6 6 6 6" />);
const IconLogout = svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>);

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

export default function Sidebar() {
  const location = useLocation();
  const { t } = useLang();
  const navigate = useNavigate();
  const { logout: clientLogout } = useAuth();
  const logoutMutation = useLogout();

  const [collapsed, setCollapsed] = useState(false);

  function handleLogout() {
    clientLogout();
    navigate("/login", { replace: true });
    logoutMutation.mutate();
  }

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
          "group/leaf flex items-center gap-2 rounded-lg py-0.5 pl-6 pr-3 text-sm transition-colors " +
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

  // Flattened nav for the collapsed icon-rail (sections become a single icon list).
  const collapsedNav = [
    ...TREE.flatMap((n) => (n.kind === "item" ? [{ label: n.label, to: n.to, icon: n.icon, disabled: n.disabled }] : n.items)),
    { label: t("geo_insights"), to: "/geo-insights", icon: IconMap, disabled: false },
    { label: t("social_media"), to: "/social", icon: IconSocial, disabled: false },
  ];

  return (
    <aside
      className={
        "relative flex h-full flex-col rounded-3xl border border-gray-200 bg-white/90 backdrop-blur " +
        "transition-[width] duration-300 ease-in-out " +
        (collapsed ? "w-[76px]" : "w-64")
      }
    >
      {/* ── Logo ── */}
      <div className={"flex items-center py-3 " + (collapsed ? "justify-center px-0" : "gap-2 px-4")}>
        <RajkamalLogo
          className={collapsed ? "" : "gap-2"}
          showWordmark={!collapsed}
          emblemWrapperClassName={collapsed ? "h-10 w-10" : "h-12 w-12"}
          wordmarkClassName="h-9"
        />
      </div>

      {/* ── Nav ── */}
      <nav className="flex min-h-0 flex-1 flex-col px-2 mt-1">
        {/* Scrollable area — scrollbar hidden */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
        >
          {collapsed ? (
            /* ── Collapsed: centered icon rail ── */
            <div className="flex flex-col items-center gap-1">
              {collapsedNav.map((it) => {
                const active = isActive(it.to);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.to + it.label}
                    to={it.disabled ? "#" : it.to}
                    onClick={(e) => it.disabled && e.preventDefault()}
                    title={it.label}
                    style={active ? { color: ACTIVE } : undefined}
                    className={
                      "flex h-10 w-10 items-center justify-center rounded-xl transition-colors " +
                      (it.disabled ? "opacity-40 pointer-events-none " : "") +
                      (active ? "bg-[#0067B5]/10" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800")
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                  </Link>
                );
              })}
            </div>
          ) : (
            /* ── Expanded: full tree — each cluster is its own separated card ── */
            <div className="space-y-2.5">
              {TREE.map((node) =>
                node.kind === "item" ? (
                  <div key={node.label} className="rounded-2xl border border-gray-100 p-1.5">
                    <TopItem label={node.label} to={node.to} icon={node.icon} disabled={node.disabled} />
                  </div>
                ) : (
                  <div key={node.title} className="rounded-2xl border border-gray-100 p-2">
                    {/* Section header — static, non-collapsible */}
                    <div className="flex items-center gap-2 px-3 pb-1.5 text-xs font-semibold tracking-wide text-gray-500">
                      <node.icon className="h-4 w-4 shrink-0 text-gray-400" />
                      <span>{node.title}</span>
                    </div>
                    {/* Sub-items — always visible */}
                    <div className="relative space-y-0">
                      {/* vertical tree guide line */}
                      <span className="pointer-events-none absolute left-3 top-1 bottom-1 w-px bg-gray-100" aria-hidden />
                      {node.items.map((leaf) => (
                        <LeafItem key={node.title + leaf.label} leaf={leaf} />
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* ── Standalone sections (boxed, like mockup) ── */}
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
          )}
        </div>

        {/* ── Divider ── */}
        <div className="my-3 h-px w-full shrink-0 bg-gray-100" />

        {/* ── Bottom: compact circular actions (Collapse · Settings · Logout) ── */}
        <div className={"flex shrink-0 items-center gap-2.5 px-1 pb-2 " + (collapsed ? "flex-col" : "justify-start")}>
          {/* Collapse / expand sidebar */}
          <button
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1C386D] text-white shadow-sm transition hover:opacity-90"
          >
            <IconArrowLeft className={"h-4 w-4 transition-transform duration-300 " + (collapsed ? "rotate-180" : "")} />
          </button>

          {/* Settings */}
          <Link
            to="/settings"
            title={t("settings")}
            className={
              "flex h-9 w-9 items-center justify-center rounded-full shadow-sm transition " +
              (isActive("/settings")
                ? "bg-[#0067B5] text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300")
            }
          >
            <IconSettingsDefault className="h-4 w-4" />
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            disabled={logoutMutation.isPending}
            title="Logout"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#B92234] text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
          >
            <IconLogout className="h-4 w-4" />
          </button>
        </div>
      </nav>
    </aside>
  );
}
