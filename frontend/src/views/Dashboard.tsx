import { useAuth } from '../modules/auth/AuthContext';
import { useLang } from '../modules/lang/LangContext';
import AppLayout from '../shared/AppLayout';

export default function Dashboard() {
  const { token } = useAuth();
  const { t } = useLang();
  return (
    <AppLayout>
      <h1 className="text-3xl font-bold text-gray-900">{t('dashboard_title')}</h1>
      <p className="mt-2 text-[#C41E3A]">{t('dashboard_subtitle')}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t('total_sales')} value="$24,320" delta="+8.2%" fromLastWeek={t('from_last_week')} />
        <StatCard label={t('orders')} value="1,284" delta="+2.1%" fromLastWeek={t('from_last_week')} />
        <StatCard label={t('customers')} value="842" delta="+4.7%" fromLastWeek={t('from_last_week')} />
        <StatCard label={t('refunds')} value="12" delta="-0.6%" fromLastWeek={t('from_last_week')} negative />
      </div>

      {/* {token && (
        <div className="mt-8">
          <h2 className="text-sm font-semibold text-gray-700">{t('auth_token')}</h2>
          <pre className="mt-2 overflow-x-auto rounded bg-gray-900 p-3 text-xs text-green-300">{token}</pre>
        </div>
      )} */}
    </AppLayout>
  );
}

type StatProps = {
  label: string;
  value: string;
  delta: string;
  fromLastWeek: string;
  negative?: boolean;
};

function StatCard({ label, value, delta, fromLastWeek, negative }: StatProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
      <p className={`mt-1 text-xs ${negative ? 'text-red-600' : 'text-green-600'}`}>{delta} {fromLastWeek}</p>
    </div>
  );
}
