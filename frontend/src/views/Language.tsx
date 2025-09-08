import AppLayout from "../shared/AppLayout";
import { useLang } from "../modules/lang/LangContext";

export default function Language() {
  const { lang, setLang, toggle, t } = useLang();
  return (
    <AppLayout>
      <h1 className="text-3xl font-bold text-gray-900">{t('language')}</h1>
      <p className="mt-3 text-gray-600">{t('select_language')}</p>

      <div className="mt-6 flex items-center gap-3">
        <button
          className={`rounded-full px-4 py-2 text-sm ring-1 ring-gray-300 ${lang === 'en' ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-gray-700'}`}
          onClick={() => setLang('en')}
        >
          {t('english')}
        </button>
        <button
          className={`rounded-full px-4 py-2 text-sm ring-1 ring-gray-300 ${lang === 'hi' ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white text-gray-700'}`}
          onClick={() => setLang('hi')}
        >
          {t('hindi')}
        </button>
        <button
          className="ml-2 rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
          onClick={toggle}
        >
          Toggle
        </button>
      </div>

      <p className="mt-4 text-sm text-gray-600">
        {t('current_language')}: <span className="font-semibold">{lang === 'en' ? t('english') : t('hindi')}</span>
      </p>
    </AppLayout>
  );
}
