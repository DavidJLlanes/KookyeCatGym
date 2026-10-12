# i18n - Internationalization System

## Overview

Sistema completo de internacionalización con soporte para **17 idiomas**:

- 🇪🇸 Español
- 🇬🇧 English
- 🇫🇷 Français
- 🇩🇪 Deutsch
- 🇮🇹 Italiano
- 🇵🇹 Português
- 🇯🇵 日本語
- 🇰🇷 한국어
- 🇨🇳 中文
- 🇷🇺 Русский
- 🇩🇰 Dansk
- 🇸🇪 Svenska
- 🇳🇱 Nederlands
- 🇵🇱 Polski
- 🇹🇷 Türkçe
- 🇮🇳 हिन्दी
- 🇸🇦 العربية

## Estructura

```
src/i18n/
├── translations.ts        # Todos los strings de traducción (17 idiomas)
├── I18nContext.tsx        # Contexto y hook useI18n()
├── index.ts               # Exports públicos
└── README.md             # Esta documentación
```

## Uso

### 1. Envolver la app con I18nProvider

```tsx
import { I18nProvider } from './i18n';

export default function App() {
  return (
    <I18nProvider>
      {/* Tu app aquí */}
    </I18nProvider>
  );
}
```

### 2. Usar el hook en componentes

```tsx
import { useI18n } from '../i18n';

export function MyComponent() {
  const { t, language, setLanguage } = useI18n();
  
  return (
    <div>
      <h1>{t('ai_coach')}</h1>
      <p>{t('save')}</p>
    </div>
  );
}
```

### 3. Selector de idioma

```tsx
import LanguageSwitcher from './components/LanguageSwitcher';

export function Settings() {
  return <LanguageSwitcher />;
}
```

## Agregando nuevas traducciones

1. **Abre** `src/i18n/translations.ts`
2. **Agrega la key** en la sección `es` (español es el base):
   ```ts
   es: {
     nueva_key: 'Texto en español',
   }
   ```
3. **Traduce** a todos los 17 idiomas en sus respectivas secciones
4. **Usa** en componentes:
   ```tsx
   const { t } = useI18n();
   <button>{t('nueva_key')}</button>
   ```

## Características

✅ **Persistencia**: El idioma se guarda en localStorage
✅ **RTL Support**: Soporte para árabe (rtl automático)
✅ **TypeScript**: Type-safe translations
✅ **Performance**: Zero overhead, sin bundles adicionales
✅ **Fallback**: Retorna la key si la traducción no existe

## Idiomas por región

### Europa Occidental
- Español, Inglés, Francés, Alemán, Italiano, Portugués, Danés, Sueco, Holandés, Polaco, Turco

### Asia
- Japonés, Coreano, Chino, Hindi

### Otros
- Ruso, Árabe

## Technical Stack

- **React 19** Context API
- **localStorage** para persistencia
- **TypeScript** para type safety
- **No dependencias externas**

## i18n Roadmap

v3.1.1+ Potenciales mejoras:
- [ ] Lazy load de idiomas
- [ ] Pluralización automática
- [ ] Formateo de fechas/números por locale
- [ ] Namespace splitting
- [ ] Translation management UI en Admin Panel
