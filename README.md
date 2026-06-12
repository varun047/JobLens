# ResumeAI — Agentic Resume Tailoring Tool (Week 1 Setup)

ResumeAI is a modern web application designed to help users tailor their resumes dynamically using agentic AI. It syncs with a user's GitHub repositories, downloads and indexes project descriptions and README files, extracts text from existing resumes (both plain text and PDFs), and generates specialized resume packages for specific job descriptions.

This repository contains the full codebase for **Week 1 Scope** of the project.

---

## 🚀 Features (Week 1 Scope)

1. **Vibrant & Dark-Mode Design**: Clean, minimal design based on the Linear.app aesthetic utilizing Tailwind CSS v4.
2. **GitHub OAuth**: Login gate integrating Supabase Auth with GitHub.
3. **Repository Sync**: Queries the GitHub REST API using the user's provider token to retrieve all repositories, main language tags, and base64-decoded README contents in parallel.
4. **Client-Side PDF Text Extraction**: Uses `pdfjs-dist` to extract plain text directly from PDFs in-browser without server dependencies.
5. **Interactive Profile Editor**: Parses resume contents heuristically and exposes an editable form to add/modify contact details, skills, experiences, projects, and education.
6. **Zustand State Management**: Independent stores for `auth`, `repos`, and `resume` states.
7. **Supabase Persistence**: Integrates triggers and RLS policies to maintain synced user profiles and a secure table for active base resumes.

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (native `@tailwindcss/vite` configuration)
- **Routing**: React Router DOM v7
- **State**: Zustand v5
- **Database / Auth**: Supabase JS Client v2
- **Network**: Axios v1
- **PDF Parser**: PDF.js (`pdfjs-dist` v6)

---

## 📦 Getting Started

### 1. Prerequisites
- Node.js (v18 or higher recommended)
- npm (or pnpm/yarn)

### 2. Installation
Clone this repository to your local workspace, navigate into the directory, and run:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file at the root of the project and populate it with your Supabase credentials (see `.env.example`):
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Supabase Setup
Execute the SQL content of [schema.sql](schema.sql) inside the Supabase SQL Editor. This will:
1. Create the `public.users` profile table.
2. Create the `public.resumes` table with JSONB structure support.
3. Configure Row Level Security (RLS) to ensure users can only view and mutate their own records.
4. Establish a trigger function `public.handle_new_user()` to automatically duplicate profiles from `auth.users` when logging in via GitHub OAuth.

### 5. GitHub OAuth Integration in Supabase
1. Go to your GitHub account -> **Settings** -> **Developer Settings** -> **OAuth Apps** -> **New OAuth App**.
2. Set the Homepage URL to your application homepage (e.g., `http://localhost:5173`).
3. Set the Authorization callback URL to your Supabase project redirect URL. You can find this in your **Supabase Dashboard** -> **Authentication** -> **Providers** -> **GitHub**. It looks like:
   `https://your-project-id.supabase.co/auth/v1/callback`
4. Copy the **Client ID** and generate a **Client Secret**.
5. Paste these values into the GitHub Auth Provider settings on the Supabase dashboard and save.

---

## 💻 Running the App

Start the development server:
```bash
npm run dev
```

Build the application for production:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```
