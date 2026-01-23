# Frañol 🇫🇷🇦🇷

Application bilingue pour apprendre le français et l'espagnol.

## 🚀 Installation

```bash
cd franol
npm install
```

## ⚙️ Configuration

Copie `.env.example` vers `.env.local` et remplis les valeurs :

```bash
cp .env.example .env.local
```

Variables requises :
- `NEXT_PUBLIC_SUPABASE_URL` - URL de ton projet Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Clé publique Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Clé secrète Supabase
- `ANTHROPIC_API_KEY` - Clé API Claude
- `APP_PASSWORD` - Mot de passe d'accès à l'app

## 🏃 Lancement

```bash
npm run dev
```

Ouvre [http://localhost:3000](http://localhost:3000)

## 📁 Structure

```
src/
├── app/
│   ├── page.tsx           # Page d'accueil (choix de langue)
│   ├── login/             # Page de connexion
│   ├── dashboard/         # Dashboard et sous-pages
│   └── api/auth/          # API d'authentification
├── components/
│   ├── home/              # Composants page d'accueil
│   └── ui/                # Composants UI réutilisables
├── contexts/
│   └── LocaleContext.tsx  # Gestion de la langue
├── translations/
│   ├── fr.json            # Traductions françaises
│   └── es.json            # Traductions espagnoles
└── lib/                   # Utilitaires
```

## 🌍 Système de traduction

Simple et robuste :
- Contexte React (`LocaleContext`)
- Fichiers JSON (`fr.json`, `es.json`)
- Hook `useLocale()` avec fonction `t('key.subkey')`

## 🔐 Authentification

- Mot de passe partagé
- Cookie sécurisé HTTP-only (30 jours)
- Middleware de protection des routes

---
