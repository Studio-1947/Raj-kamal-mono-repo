import { useState } from "react";
import AppLayout from "../shared/AppLayout";
import { useLang } from "../modules/lang/LangContext";
import {
  useSessions,
  useRevokeSession,
  useRevokeOtherSessions,
  type LoginSession,
} from "../services/sessionsService";

// Simple relative-time formatter ("5 min ago", "2 days ago").
function useRelativeTime() {
  const { t } = useLang();
  return (iso: string): string => {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "—";
    const diffMs = Date.now() - then;
    const sec = Math.round(diffMs / 1000);
    if (sec < 45) return t("just_now");
    const min = Math.round(sec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.round(min / 60);
    if (hr < 24) return `${hr} hr ago`;
    const day = Math.round(hr / 24);
    if (day < 30) return `${day} day${day === 1 ? "" : "s"} ago`;
    return new Date(iso).toLocaleDateString();
  };
}

const DesktopIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
  </svg>
);

const MobileIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
);

function deviceIcon(device: string | null, className: string) {
  if (device === "Mobile" || device === "Tablet") return <MobileIcon className={className} />;
  return <DesktopIcon className={className} />;
}

function deviceLabel(s: LoginSession, unknown: string): string {
  const parts = [s.browser, s.os].filter(Boolean);
  if (parts.length === 0) return unknown;
  return parts.join(" · ");
}

function SessionCard({ session }: { session: LoginSession }) {
  const { t } = useLang();
  const rel = useRelativeTime();
  const revoke = useRevokeSession();

  return (
    <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${session.current ? "bg-rose-50 text-rose-500" : "bg-slate-100 text-slate-500"}`}>
        {deviceIcon(session.device, "h-6 w-6")}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-slate-900">{deviceLabel(session, t("unknown_device"))}</span>
          {session.current && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600">
              {t("this_device")}
            </span>
          )}
        </div>
        <div className="mt-1 space-y-0.5 text-sm text-slate-500">
          {session.ipAddress && <p className="font-mono text-xs text-slate-400">{session.ipAddress}</p>}
          <p>
            {t("last_active")}: {rel(session.lastActiveAt)} · {t("signed_in")}: {rel(session.createdAt)}
          </p>
        </div>
      </div>

      {!session.current && (
        <button
          type="button"
          onClick={() => revoke.mutate(session.id)}
          disabled={revoke.isPending}
          className="shrink-0 rounded-xl border border-rose-200 px-3 py-1.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {revoke.isPending ? t("revoking") : t("revoke")}
        </button>
      )}
    </div>
  );
}

export default function Settings() {
  const { t } = useLang();
  const { data, isLoading, isError, refetch } = useSessions();
  const revokeOthers = useRevokeOtherSessions();
  const [confirmOthers, setConfirmOthers] = useState(false);

  const sessions = data?.data.sessions ?? [];
  const hasOthers = sessions.some((s) => !s.current);

  return (
    <AppLayout>
      <h1 className="text-3xl font-normal text-gray-900">{t("settings")}</h1>

      <section className="mt-8 max-w-3xl">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-medium text-slate-900">{t("login_sessions")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("login_sessions_subtitle")}</p>
          </div>
          {hasOthers && (
            <button
              type="button"
              onClick={() => (confirmOthers ? revokeOthers.mutate(undefined, { onSettled: () => setConfirmOthers(false) }) : setConfirmOthers(true))}
              disabled={revokeOthers.isPending}
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {revokeOthers.isPending
                ? t("logging_out_others")
                : confirmOthers
                  ? `${t("log_out_others")}?`
                  : t("log_out_others")}
            </button>
          )}
        </div>

        <div className="mt-5 space-y-3">
          {isLoading && (
            <>
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
              <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            </>
          )}

          {isError && !isLoading && (
            <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{t("sessions_load_error")}</span>
              <button
                type="button"
                onClick={() => refetch()}
                className="rounded-lg px-3 py-1 font-medium text-red-700 hover:bg-red-100"
              >
                {t("retry")}
              </button>
            </div>
          )}

          {!isLoading && !isError && sessions.length === 0 && (
            <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
              {t("no_active_sessions")}
            </p>
          )}

          {!isLoading &&
            !isError &&
            sessions.map((s) => <SessionCard key={s.id} session={s} />)}
        </div>
      </section>
    </AppLayout>
  );
}
