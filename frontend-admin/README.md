# Frontend admin — École Paul Bert

Interface React (Vite + TypeScript + Tailwind) pour l’administration scolaire.

## Prérequis

- Node.js 20+
- Backend API démarré ([`../backend-api`](../backend-api))

## Installation

```bash
cd frontend-admin
npm install
```

Optionnel : copier `.env.example` vers `.env` et définir `VITE_API_BASE_URL` si vous n’utilisez pas le proxy de développement.

## Développement

```bash
npm run dev
```

Par défaut, Vite écoute sur le port **5173** et proxifie `/api` vers `http://localhost:8000` (voir `vite.config.ts`). Les appels axios utilisent le préfixe `/api` ; avec le proxy, aucune variable d’environnement n’est nécessaire.

## Build

```bash
npm run build
npm run preview
```

## Structure

- `src/api` — client HTTP (axios) et appels auth
- `src/contexts` — session utilisateur (`AuthProvider`)
- `src/layouts` — layout administration
- `src/components/layout` — barre latérale, en-tête, pied de page
- `src/pages` — pages (tableau de bord, placeholders modules)
- `src/routes` — garde de route authentifiée

Voir aussi [Guide de développement](../docs/GUIDE_DEVELOPPEMENT.md).
