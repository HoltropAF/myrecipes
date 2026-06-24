# myrecipes

A personal recipe app — organise your recipes into a digital cookbook, track what you cook, manage your shopping list, and get allergen and diet information automatically from your ingredients.

**Live app:** [myrecipes-pi.vercel.app](https://myrecipes-pi.vercel.app)

---

## Using the app (no coding needed)

The app is a website — nothing to download or install.

### Step 1 — Open it

Go to **[myrecipes-pi.vercel.app](https://myrecipes-pi.vercel.app)** in your phone's browser (Chrome, Safari, or Firefox all work).

### Step 2 — Sign in

Tap **Sign in**, enter your email address, and tap **Send magic link**. Open the email you receive and tap the link inside — you'll be signed in automatically. There is no password to remember.

### Step 3 — Add it to your home screen (optional but recommended)

This makes the app open full-screen, just like a regular app from the store.

- **iPhone (Safari):** tap the Share button (square with an arrow) → scroll down → tap **Add to Home Screen** → tap **Add**.
- **Android (Chrome):** tap the three-dot menu (⋮) in the top-right corner → tap **Add to Home screen** → tap **Add**. (Chrome may also show a pop-up banner at the bottom suggesting this automatically.)

After this you can open myrecipes from your home screen icon and it will look and feel like a native app.

---

## What you can do

| Feature | Where to find it |
| --- | --- |
| Browse and search your recipes | **Recipes** tab |
| Add a new recipe | **+** button (bottom-right) |
| Edit a recipe | Open it → tap **Edit** (top-right) |
| Shopping list | **List** tab |
| Log a cook and rate recipes | **+** button → **Log a cook**, or inside any recipe → **Log** tab |
| See your cooking stats | **Stats** tab |
| Plan meals from multiple recipes | **Plan** tab |
| Change theme, units, backup data | **Settings** tab |

For a full walkthrough of every feature — including how to use AI to extract recipes from websites — see the **[detailed wiki](./docs/wiki.md)**.

---

## For developers — running the app yourself

This section is for anyone who wants to run their own copy of the app, make changes to the code, or host it for themselves.

### What you need before starting

- **Node.js** (version 18 or newer) — [download it here](https://nodejs.org). Choose the LTS version. When the installer asks you to also install tools for native modules, you can skip that.
- **Git** — [download it here](https://git-scm.com). Accept all defaults during installation.
- A **Supabase** account (free) — [sign up at supabase.com](https://supabase.com).
- A **Vercel** account (free, for deployment only) — [sign up at vercel.com](https://vercel.com). You only need this if you want to publish it online.

Once Node.js is installed, open a terminal:

- **Mac:** open the Terminal app (search for it in Spotlight).
- **Windows:** press Win + R, type `cmd`, press Enter.
- **Linux:** open your terminal emulator.

You can check Node is installed by typing `node --version` and pressing Enter. You should see something like `v20.11.0`.

---

### Step 1 — Get the code

```bash
git clone https://github.com/HoltropAF/myrecipes.git
cd myrecipes
```

This downloads the project into a folder called `myrecipes` and moves you into it.

---

### Step 2 — Install dependencies

```bash
npm install
```

This downloads all the libraries the app needs. It only takes a minute. You should see something like `added 312 packages`.

---

### Step 3 — Set up a Supabase project

1. Go to [supabase.com](https://supabase.com) and sign in.
2. Click **New project**.
3. Give it a name (e.g. `myrecipes`), choose a region close to you, and set a database password. Click **Create new project** and wait about a minute for it to be ready.
4. In your project, click **SQL Editor** in the left sidebar.
5. Click **New query**.
6. Open the file `supabase-schema.sql` from this project in a text editor (Notepad, TextEdit, or VS Code), select all the text, and paste it into the SQL editor.
7. Click **Run**. You should see "Success. No rows returned."

This creates all the tables, views, and security rules the app needs.

---

### Step 4 — Get your Supabase credentials

1. In your Supabase project, click **Project Settings** (the cog icon at the bottom of the left sidebar).
2. Click **API**.
3. Copy the **Project URL** (looks like `https://xxxxxxxxxxxx.supabase.co`).
4. Copy the **anon / public** key (a long string of letters and numbers).

---

### Step 5 — Create a `.env` file

In your `myrecipes` folder, there is a file called `.env.example`. Make a copy of it called `.env`:

```bash
cp .env.example .env
```

Open the new `.env` file in a text editor and fill in your two Supabase values:

```dotenv
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Save and close the file.

---

### Step 6 — Enable email authentication in Supabase

1. In Supabase, go to **Authentication** → **Providers**.
2. Make sure **Email** is enabled (it is by default).
3. Scroll down to **Email** settings. For a personal project you can leave **Confirm email** on — users get a magic link and are signed in immediately.

---

### Step 7 — Start the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The app should load and you can sign in with your email.

Any changes you make to the code will update the page automatically — you don't need to restart.

To stop the server, press `Ctrl + C` in the terminal.

---

### Deploying to Vercel (publishing it online)

Once the app works locally you can publish it so you (or others) can access it from anywhere.

1. Push your code to a GitHub repository (the `.env` file is in `.gitignore` so your credentials will not be uploaded).
2. Go to [vercel.com](https://vercel.com), click **Add New Project**, and import your GitHub repository.
3. On the configuration screen, open **Environment Variables** and add:
   - `VITE_SUPABASE_URL` → your Project URL
   - `VITE_SUPABASE_ANON_KEY` → your anon key
4. Click **Deploy**. Vercel will build and publish the app.

Every time you push changes to the `main` branch on GitHub, Vercel automatically rebuilds and redeploys.

---

## Project structure

```text
myrecipes/
├── src/
│   ├── App.jsx                  Main app shell, routing, auth
│   ├── components/
│   │   ├── views/               Full-screen views (Recipes, Shopping, Stats, Plan, Settings)
│   │   ├── recipe_tabs/         Tabs inside a recipe detail (Info, Ingredients, Steps, Log, Notes)
│   │   └── wizard/              Multi-step recipe creation/edit form
│   └── lib/
│       ├── supabase.js          Supabase client
│       ├── ingredientParser.js  Parses pasted ingredient text into structured data
│       ├── unitConverter.js     Metric ↔ US unit conversion
│       ├── recipeTags.js        Allergen labels, diet tag constants, meal-type matchers
│       └── exportUtils.js       JSON backup and print-to-PDF export
├── supabase-schema.sql          Full database schema (run this in Supabase SQL Editor)
├── .env.example                 Template for environment variables
└── docs/
    └── wiki.md                  Detailed user guide and AI integration instructions
```

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + Vite |
| Database + Auth | Supabase (PostgreSQL + magic-link email auth) |
| Hosting | Vercel |
| Styling | Plain CSS-in-JS (no CSS framework) |

---

## Links

- **Live app:** [myrecipes-pi.vercel.app](https://myrecipes-pi.vercel.app)
- **Detailed wiki:** [docs/wiki.md](./docs/wiki.md)
- **Instagram:** [@AnnuhFloor](https://instagram.com/AnnuhFloor)
