import React from 'react';
import { useI18n } from '../i18n/I18nContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitcher() {
  const { language, setLanguage, languages } = useI18n();

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4 text-slate-400" />
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as any)}
        className="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-slate-200 text-sm hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
