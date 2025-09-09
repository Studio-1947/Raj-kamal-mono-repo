import AppLayout from "../shared/AppLayout";
import { useLang } from "../modules/lang/LangContext";
import HomeDashboard from "../components/homepage/Chart";
import HindiBooksSalesDashboard from "../components/homepage/HomeC";
// import HindiBooksSalesDashboard from "../components/homepage/HomeC";

export default function Home() {
  const { t } = useLang();
  return (
    <AppLayout>
      <h1 className="text-3xl font-bold text-gray-900">{t("welcome")}</h1>
      <p className=" text-gray-600">{t("welcome_subtitle")}</p>
      <div>
        <HindiBooksSalesDashboard />
      </div>
    </AppLayout>
  );
}
