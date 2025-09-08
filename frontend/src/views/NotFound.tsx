import { Link } from 'react-router-dom';
import { useLang } from '../modules/lang/LangContext';

export default function NotFound() {
  const { t } = useLang();
  return (
    <main className="py-10">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="mt-3 text-gray-600">{t('not_found_title')}</p>
      <Link className="mt-4 inline-block text-blue-600" to="/">{t('go_home')}</Link>
    </main>
  );
}
