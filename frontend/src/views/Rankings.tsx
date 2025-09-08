import AppLayout from "../shared/AppLayout";
import { useLang } from "../modules/lang/LangContext";

export default function Rankings() {
  const { t } = useLang();
  return (
    <AppLayout>
      <h1 className="text-3xl font-bold text-gray-900">{t('rankings')}</h1>
      <p className="mt-3 text-gray-600">{t('coming_soon')}</p>
    </AppLayout>
  );
}
