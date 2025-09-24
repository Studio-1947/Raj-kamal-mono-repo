import { useAuth } from '../modules/auth/AuthContext';
import { useLang } from '../modules/lang/LangContext';
import { useDashboardOverview } from '../services/dashboardService';
import AppLayout from '../shared/AppLayout';
import { LoadingSpinner } from '../components/LoadingSpinner';

export default function Dashboard() {
  const { token } = useAuth();
  const { t } = useLang();
  const { data: dashboardData, isLoading, error } = useDashboardOverview();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-20">
          <LoadingSpinner />
        </div>
      </AppLayout>
    );
  }

  if (error || !dashboardData?.data) {
    return (
      <AppLayout>
        <h1 className="text-3xl font-bold text-gray-900">{t('dashboard_title')}</h1>
        <div className="mt-6 rounded-lg bg-red-50 border border-red-200 p-4">
          <p className="text-red-700">Error loading dashboard data</p>
        </div>
      </AppLayout>
    );
  }

  const { stats } = dashboardData.data;

  return (
    <AppLayout>
      <h1 className="text-3xl font-bold text-gray-900">{t('dashboard_title')}</h1>
      <p className="mt-2 text-[#C41E3A]">{t('dashboard_subtitle')}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          label={t('total_sales')} 
          value={`₹${(stats.totalSales / 100000).toFixed(1)}L`} 
          delta={`+${stats.salesGrowth}%`} 
          fromLastWeek={t('from_last_week')} 
        />
        <StatCard 
          label={t('orders')} 
          value={stats.orders.toLocaleString()} 
          delta={`+${stats.ordersGrowth}%`} 
          fromLastWeek={t('from_last_week')} 
        />
        <StatCard 
          label={t('customers')} 
          value={stats.customers.toLocaleString()} 
          delta={`+${stats.customersGrowth}%`} 
          fromLastWeek={t('from_last_week')} 
        />
        <StatCard 
          label={t('refunds')} 
          value={stats.refunds.toString()} 
          delta={`${stats.refundsGrowth}%`} 
          fromLastWeek={t('from_last_week')} 
          negative={stats.refundsGrowth < 0}
        />
      </div>
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
