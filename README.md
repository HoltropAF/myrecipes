# myrecipes 🍝

A personal recipe app — browse recipes, organize them into a cookbook by category, search by ingredient, and keep a shopping list that automatically combines ingredients from multiple recipes.

## 📱 How to use the app (no coding needed!)

This is a web app — there's nothing to install from a store. Just open it in your phone's browser:

1. Open this link on your phone: **[myrecipes-pi.vercel.app](https://myrecipes-pi.vercel.app)**
2. Sign in with your email — you'll get a **magic link** (no password needed). Tap the link in your inbox and you're in.
3. *(Optional, but recommended)* Add it to your home screen so it feels like a real app:
   - **iPhone (Safari):** tap the **Share** icon → **Add to Home Screen**
   - **Android (Chrome):** tap the **⋮** menu → **Add to Home screen** (or you may see a banner suggesting this automatically)

That's it — it'll open full-screen from your home screen icon from then on, just like any other app.

## ✨ What you can do

- **Recipes** — browse all your recipes, search by name or by ingredient ("what can I make with chicken?")
- **Cookbook** — recipes grouped into categories (Pasta, Tacos, Curry, etc.)
- **Shopping list** — add a recipe's ingredients with one tap, add extra items manually, check things off as you shop; items with the same name automatically combine
- **+ Add** — create a new recipe with a step-by-step wizard: paste your ingredients and steps and it'll organize them for you, including alternate versions of a recipe (e.g. different toppings)

Your data is private to your account — nobody else can see your recipes or shopping list.

---

## 🛠 For developers

This section is only relevant if you want to run or modify the code yourself.

**Stack:** React + Vite, Supabase (database + auth), hosted on Vercel.

### Local setup
```bash
git clone https://github.com/HoltropAF/myrecipes.git
cd myrecipes
npm install
cp .env.example .env   # fill in your own Supabase URL + anon key
npm run dev
```

### Database
The schema is in [`supabase-schema.sql`](./supabase-schema.sql) — run it against a fresh Supabase project to set up the `recipes`, `shopping_list`, and `cook_log` tables with Row Level Security enabled.

### Deployment
Pushes to `main` auto-deploy to Vercel.
