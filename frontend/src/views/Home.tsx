import AppLayout from "../shared/AppLayout";
import { useLang } from "../modules/lang/LangContext";
import HindiBooksSalesDashboard from "../components/homepage/HomeC";
import SocialMediaOverview from "../components/homepage/SocialMediaOverview";

export default function Home() {
  const { t } = useLang();
  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Social Media Overview Section */}
        <SocialMediaOverview />

        {/* Sales Dashboard Section */}
        <HindiBooksSalesDashboard />
      </div>
    </AppLayout>
  );
}
