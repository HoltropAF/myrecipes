# myrecipes — Detailed User Guide & Developer Wiki

This guide covers every part of the app in detail, explains how each section works, and includes a full section on connecting the app to AI assistants (Claude and ChatGPT) so you can extract recipes from websites and keep your cookbook up to date with minimal effort.

---

## Table of contents

1. [Getting started](#1-getting-started)
2. [The Recipes tab](#2-the-recipes-tab)
3. [Recipe detail page](#3-recipe-detail-page)
4. [Adding and editing recipes](#4-adding-and-editing-recipes)
5. [Shopping list](#5-shopping-list)
6. [Meal plan](#6-meal-plan)
7. [Stats](#7-stats)
8. [Settings](#8-settings)
9. [Backup and export](#9-backup-and-export)
10. [Using AI to manage your recipes](#10-using-ai-to-manage-your-recipes)

---

## 1. Getting started

### Signing in

myrecipes uses **magic link** authentication — there is no password. When you tap **Sign in**, enter your email address and tap **Send magic link**. You will receive an email within a few seconds. Tap the link inside and you are signed in. The link is single-use and expires after 24 hours, but once you are signed in, the app remembers you on that device.

If you don't see the email, check your spam or junk folder. The sender is Supabase (the database service that powers the app).

### Guest mode

Tap **Try as guest** on the sign-in screen to browse a set of example recipes without creating an account. Guest mode is read-only — you can explore every part of the app but changes are not saved and there is no shopping list persistence. Tap **Sign out** in Settings to leave guest mode.

### Adding the app to your home screen

Once you have added the app to your home screen it opens full-screen (no browser address bar) and works like a native app.

- **iPhone (Safari):** tap the Share button → scroll down → **Add to Home Screen** → **Add**.
- **Android (Chrome):** tap ⋮ (top-right) → **Add to Home screen** → **Add**.

### Your data

All your recipes, cooking logs, and shopping list items are private to your account. Nobody else can see or access them. Data is stored in a secure PostgreSQL database (via Supabase) with row-level security — meaning the database itself enforces that each user can only read and write their own data, even if someone were to inspect the API directly.

---

## 2. The Recipes tab

This is the main screen. Everything starts here.

### Cookbook view vs List view

You can switch between two ways of browsing:

- **Cookbook view** (default): recipes are grouped into categories (e.g. "Main dishes", "Desserts") shown as collapsible folders. Tap a category to expand it and see the recipes inside. Subcategories nest underneath. This view works well when you know what kind of recipe you are looking for.
- **List view**: a flat, scrollable list of all your recipes in one place. Easier for searching or sorting by name.

To change the default view, go to **Settings → Recipes → Browse as**.

### Searching

The search box at the top of the Recipes tab works in two modes:

- **Name search** (default): matches the recipe title, subtitle, category, tags, and notes.
- **Ingredient search**: type an ingredient name (e.g. "courgette", "salmon") and the app will find every recipe that contains it. Useful when you have something in the fridge and want to see what you can make.

To change the default search mode, go to **Settings → Recipes → Search by**.

### Compact mode

Enable compact mode in **Settings → Recipes** to show only the recipe title, subtitle, and how many times you have cooked it on each card. Useful if you have a lot of recipes and want to see more at once.

### Filters

Tap the **Filters** button to open the filter panel. You can filter by:

- **Meal type**: Breakfast, Lunch, Dinner, Side, Dessert, Snack, Drink — inferred from the recipe's category.
- **Main ingredient**: Chicken, Beef, Salmon, Tofu, Pasta, Rice, and more — detected from the ingredient list.
- **Tags**: your custom labels (e.g. "quick", "freezes well", "meal prep").
- **Diet**: Vegan, Vegetarian, Pescatarian — computed automatically from the ingredient list (see below).

Multiple filters can be active at once. The button shows a count of how many are active. Tap a pill again to remove that filter.

### Recipe cards

Each card in List view shows:

- **Photo or category icon** (left side)
- **Title** and optional **subtitle** (tagline)
- **Ingredient count · step count · category** — or if ingredient search is active, which ingredient matched
- **User tags** — your custom labels in sage green
- **Diet badges** — Vegan / Vegetarian / Pescatarian in sage green (only shown if the recipe qualifies)
- **Allergen badges** — Meat / Fish / Dairy / Gluten / Egg / Shellfish / Nuts in a neutral grey (only shown if detected)

Diet and allergen information is computed automatically from the ingredient names in your recipe matched against a reference table (`ingredient_tags`) in the database. If a badge is wrong or missing, it means either the ingredient name in the recipe doesn't match the reference table, or the reference table doesn't yet have that ingredient. See the [AI section](#10-using-ai-to-manage-your-recipes) for how to populate or update the reference table.

---

## 3. Recipe detail page

Tap any recipe to open its detail page. The page has five tabs at the top.

### Info tab

- **Photo** or a placeholder icon if no photo has been added.
- **Meta chips**: category, cooking time in minutes, and freezer-friendliness (if set).
- **Allergen and diet badges**: the same badges shown on recipe cards, but slightly larger.
- **Version picker**: if the recipe has alternate versions (e.g. "With mushrooms", "Vegan version"), you can switch between them here. Switching version also changes the ingredients and steps shown on those tabs.

### Ingredients tab

- **Servings adjuster**: tap + or − to scale ingredient amounts up or down. The original number of servings is stored with the recipe; the adjuster multiplies all amounts proportionally.
- **Version picker**: also appears here since switching version changes the ingredient list.
- **Ingredient list**: grouped if the recipe uses groups (e.g. "For the sauce", "For the salad"). Tap a group header to collapse or expand it.
- Each ingredient line shows: **amount · unit · name** and, if set, a **note** in italic grey text (e.g. "— Bij voorkeur Unox rookworst"). Tap any ingredient to mark it as checked (strikethrough + dimmed) — useful while cooking to track what you've already added.
- **+ Add to list** button (top-right): adds all the ingredients to your shopping list in one tap. Amounts are scaled to the current servings setting.

### Units toggle

The button in the header (showing `g / ml` or `cup / oz`) toggles between metric and US measurements. This converts amounts on the fly — for example, 240 ml becomes 1 cup. The conversion happens in the display layer only; the stored values are always in their original units.

### Steps tab

The cooking steps, optionally split into sections (e.g. "Prep", "Cooking", "Serving"). Each step that has a timer shows a **Start timer** button — tap it to start a countdown. Timers keep running if you switch tabs or scroll.

**Cooking mode**: tap **Start cooking** at the top of the Steps tab for a full-screen, step-by-step guided view. It shows one step at a time with large text, a built-in timer for timed steps, and Prev / Next buttons. Press the X to exit back to the recipe.

### Log tab

A chronological history of every time you have cooked this recipe. Each entry shows:

- The date
- A thumbs up or thumbs down rating (optional)
- Any notes you added at the time
- Which version you cooked (if applicable)

To add a new log entry: tap **+ Log this cook** at the top of the Log tab, or use the floating **+** button on the main screen and choose **Log a cook** (which lets you pick which recipe from a list).

### Notes tab

A freeform text field for anything you want to remember about the recipe — storage instructions, sourcing notes, things you would change next time. This is separate from the per-cook notes in the Log tab.

---

## 4. Adding and editing recipes

Tap **+ Add** (top-right of Recipes) or the **+** floating button to open the recipe wizard. The wizard has up to five steps.

### Step 1 — Title

Enter the recipe title. You can also add a one-line subtitle (tagline) — this appears beneath the title on recipe cards and on the detail page. Example: title "Spaghetti Bolognese", tagline "Classic slow-cooked Sunday sauce".

### Step 2 — Ingredients

There are two ways to add ingredients:

**Paste and parse (fastest):** paste a list of ingredients into the large text area — one ingredient per line. The parser understands most common formats:

```text
300g kipfilet
2 el olijfolie
1 blik tomaten (400g)
zout en peper naar smaak
4 eetlepels geraspte kaas
```

Tap **Parse & add** to convert the pasted text into structured rows. The parser tries to detect the amount, unit, and ingredient name automatically. You can then correct any row manually.

**Manual rows:** tap **+ add row manually** to add a blank row. Fill in the amount, unit, and ingredient name in the three fields.

**Ingredient notes:** each ingredient row has a **+ note** button below it. Tap it to expand a note field where you can add a specific hint, like "Bij voorkeur Unox rookworst" or "room temperature". The note appears in italic on the Ingredients tab when reading the recipe.

**Autocomplete:** when you type in the ingredient name field, the app queries the ingredient reference table and suggests matching canonical names in a dropdown. Selecting a suggestion fills in the name — it does not change the amount or unit. If there are no suggestions, just keep typing.

**Groups:** tap **+ split into groups** to organise ingredients under named headings (e.g. "For the marinade", "For serving"). This is useful for complex recipes with multiple components. Tap **+ add another group** to add more sections.

### Step 3 — Steps

Works the same way as ingredients: paste your steps (one per line) and tap **Parse & add**, or add them manually.

Steps can optionally include a **timer** — if a step mentions a time ("bake for 25 minutes", "simmer 10 min"), the parser tries to detect it automatically. You can also set it manually on any step row.

**Sections:** tap **+ add section** to group steps (e.g. "Prep", "Cooking", "Plating").

### Step 4 — Extras (all optional)

- **Servings**: how many people the recipe serves. This is the base number used for the servings adjuster on the Ingredients tab.
- **Total minutes**: rough cooking time shown on recipe cards.
- **Category**: the folder the recipe sits in. Start typing and existing categories are suggested (e.g. "Main dishes", "Soups & Salads").
- **Subcategory**: an optional second-level folder inside the category.
- **Photo**: tap the photo area to upload an image from your device. A link to Google Images (pre-filled with the recipe title) is shown next to the label — tap it to search for a photo, download it, and then upload it through the file picker.
- **Tags**: free-form labels. Type a tag and press Enter. Existing tags from your other recipes are suggested as you type. Examples: "quick", "freezes well", "meal prep", "date night".
- **Notes**: any freeform notes to store with the recipe (storage tips, source URL, things to change next time).
- **Freezer-friendly**: three-way toggle — yes, no, or not assessed.

### Step 5 — Version (optional)

Add an alternate version of the same recipe — for example "With mushrooms", "Vegan version", or "Gluten-free". A version has its own ingredient and step lists. On the detail page you can switch between the original and any versions using the version picker on the Info and Ingredients tabs.

### Saving

Tap **Done** on the last step. The recipe is saved to the database immediately. If you are editing an existing recipe, the updated version replaces the previous one.

### Deleting a recipe

Open the recipe → tap **Delete** (top-right, in red). The recipe disappears immediately and an **Undo** toast appears at the bottom of the screen. You have 5 seconds to tap **Undo** to get it back. After that it is permanently deleted.

---

## 5. Shopping list

The **List** tab shows your current shopping list.

### Adding items

- **From a recipe**: open the recipe → Ingredients tab → tap **+ Add to list**. All ingredients are added as individual items. If you have adjusted the servings, the scaled amounts are used.
- **Manually**: tap **+ Add item** at the top of the shopping list, type the item name, and optionally an amount and unit.

### Smart merging

If you add the same ingredient from multiple recipes (e.g. "ui" from a pasta and a soup), the app automatically combines them into one line showing the total amount. Items with the same name but different units are not merged (e.g. "100g butter" and "2 tbsp butter" remain separate).

### Checking off items

Tap any item to mark it as checked. Checked items move to the bottom of the list and are greyed out. Tap again to uncheck.

### Deleting items

Swipe left on any item to reveal a delete button.

### Clearing the list

Tap **Clear checked** at the top to remove all checked items at once. Tap **Clear all** to start fresh.

---

## 6. Meal plan

The **Plan** tab helps you group recipes together for a week's worth of cooking. It has two parts:

**What can I make?** — shown at the top of the Recipes tab, this feature automatically suggests recipe bundles based on shared ingredients or category clusters. Bundles of 3+ recipes that share a main protein (e.g. all chicken recipes) or a category are surfaced as suggestions. Tap a suggestion to see the recipes in it.

**Meal groups**: tap **+ New group** on the Plan tab to create a named bundle (e.g. "This week", "BBQ weekend"). Search for recipes and add them to the group. Each group shows a combined shopping list — the app merges ingredient amounts across all the recipes in the group so you can shop for everything at once.

---

## 7. Stats

The **Stats** tab gives you an overview of your cooking history.

**Summary tiles** (top row):
- **Recipes** — total number of recipes in your cookbook
- **Cooks logged** — total number of cook log entries across all recipes
- **Recipes tried** — number of distinct recipes you have cooked at least once
- **Never made** — number of recipes you have saved but never cooked

**Recipes by category**: a horizontal bar chart showing how many recipes you have in each category, sorted from most to least.

**Most cooked**: your top 5 most-cooked recipes by total log count.

**Top rated**: your top 5 recipes by thumbs-up count (only recipes where up votes outnumber down votes appear here).

Stats update live — as soon as you log a cook, the numbers change.

---

## 8. Settings

Open Settings from the bottom navigation bar. Settings are organised into five sections, selectable from a row of pill buttons at the top.

### General

Shows the email address you are signed in with, links to the GitHub repository and Instagram, and a **Sign out** button.

### Appearance

- **Theme**: Light, Dark, or Auto. Auto follows your phone's system-wide dark/light mode preference.
- **Measurements**: switch between **g / ml** (metric) and **cup / oz** (US). This sets the default for all recipes — you can still override it per-recipe using the toggle button on any recipe's detail page.

### Recipes

- **Browse as**: Cookbook (folder view) or List. Sets what you see when you open the Recipes tab.
- **Search by**: Name (searches title, subtitle, tags, notes) or Ingredient (searches ingredient lists).
- **Compact mode**: on/off toggle. Compact cards show only title, subtitle, and times cooked — no photo, no ingredient count, no tags. Good for long recipe lists on small screens.
- **Default open category**: pick a category that opens automatically every time you switch to Cookbook view. Useful if most of your cooking comes from one category.

Tap **Save changes** at the bottom of the screen to apply. Tap **Discard** to revert.

### Tags

Shows every tag you have used across all recipes, sorted by how many recipes have it. For each tag you can:

- **Rename**: type a new name and save — the tag is renamed on every recipe that has it in one operation.
- **Delete**: removes the tag from every recipe that has it.

To add new tags, edit a recipe and use the Tags field in Step 4.

### Backup

- **Download backup (.json)**: exports all your data (recipes, cook log, shopping list, meal groups, preferences) as a single JSON file. Store this somewhere safe — it is the only way to recover your data if your account is ever lost.
- **Export cookbook (PDF)**: generates a print-ready PDF of all your recipes, organised by category with a table of contents. The PDF is created entirely in the browser using the native print dialog (no third-party library) — you will see a print preview where you can save as PDF.

---

## 9. Backup and export

### JSON backup format

The backup file contains the following top-level keys:

```json
{
  "exported_at": "2025-01-01T12:00:00.000Z",
  "app": "myrecipes",
  "version": 1,
  "recipes": [...],
  "cook_log": [...],
  "shopping_list": [...],
  "meal_groups": [...],
  "preferences": {...}
}
```

Each recipe object mirrors the database row exactly, including the full `ingredients` and `steps` JSONB arrays. This format is intentionally human-readable so you can open it in any text editor or import it into another tool.

### Re-importing data

There is no automated import UI yet. To restore from a backup, you or a developer can run a script against the Supabase database, or paste recipe objects one at a time using the Supabase Table Editor. An import wizard may be added in a future version.

---

## 10. Using AI to manage your recipes

This section explains how to use AI assistants — specifically **Claude** (from Anthropic) and **ChatGPT** (from OpenAI) — to extract recipes from websites, format them for the app, and keep your ingredient reference table populated.

### Why AI is useful here

The app stores recipes in a specific JSON structure. Typing recipes manually works but is time-consuming. AI models are very good at reading a recipe page and converting it to structured data. Once you have a formatted JSON block, you can paste it directly into the database using the Supabase Table Editor, or give it to a developer to import.

AI is also useful for:
- Extracting recipes from screenshots, PDFs, or printed books (just paste the text)
- Translating recipes to another language while preserving the structure
- Populating the `ingredient_tags` reference table with allergen data

---

### The recipe JSON structure

This is the structure the app expects for each recipe. You will paste this into your prompts so the AI knows exactly what format to produce.

```json
{
  "title": "Recipe title",
  "tagline": "Short one-line subtitle (optional)",
  "category": "Main dishes",
  "subcategory": "Weeknight",
  "servings": 4,
  "total_minutes": 30,
  "freezer_friendly": true,
  "notes": "Any storage or prep notes",
  "tags": ["quick", "freezes well"],
  "ingredients": [
    {
      "group": null,
      "items": [
        { "id": "ing_1", "amount": 300, "unit": "g", "name": "kipfilet", "note": null },
        { "id": "ing_2", "amount": 1,   "unit": null, "name": "ui, gesnipperd", "note": null }
      ]
    },
    {
      "group": "Voor de saus",
      "items": [
        { "id": "ing_3", "amount": 400, "unit": "ml", "name": "kokosmelk", "note": "Volle kokosmelk" }
      ]
    }
  ],
  "steps": [
    {
      "group": null,
      "items": [
        { "id": "step_1", "content": "Verhit de olie in een pan op middelhoog vuur.", "timer_seconds": null },
        { "id": "step_2", "content": "Bak de ui 5 minuten tot glazig.", "timer_seconds": 300 }
      ]
    }
  ]
}
```

**Key rules for the AI:**
- `id` fields must be unique strings. Simple formats like `"ing_1"`, `"ing_2"`, or `"step_1"` work fine.
- `amount` must be a number or `null` (not a string like `"2"` or `"½"` — convert fractions to decimals, e.g. `0.5`).
- `unit` is a short string like `"g"`, `"ml"`, `"el"` (eetlepel), `"tl"` (theelepel), `"kop"`, `"stuk"`, or `null`.
- `group` is `null` when ingredients are not split into sections.
- `timer_seconds` is a number in seconds, or `null`.

---

### Extracting a recipe from a URL — Claude

**Option A: Claude.ai (website)**

1. Go to [claude.ai](https://claude.ai) and start a new conversation.
2. Use this prompt (replace the URL with your actual link):

---

> I want to save a recipe to my personal recipe app. Please fetch this recipe page and convert it to the exact JSON structure below. Keep ingredient names in the original language. Set IDs to "ing_1", "ing_2", etc. for ingredients and "step_1", "step_2", etc. for steps. Convert all fractions to decimals (½ → 0.5, ¼ → 0.25). Leave `note` as null unless the original recipe includes a specific brand or variant tip for that ingredient.
>
> Recipe URL: **[PASTE YOUR URL HERE]**
>
> JSON structure to use:
>
> ```json
> {
>   "title": "",
>   "tagline": "",
>   "category": "",
>   "subcategory": "",
>   "servings": null,
>   "total_minutes": null,
>   "freezer_friendly": null,
>   "notes": "",
>   "tags": [],
>   "ingredients": [{"group": null, "items": [{"id": "", "amount": null, "unit": null, "name": "", "note": null}]}],
>   "steps": [{"group": null, "items": [{"id": "", "content": "", "timer_seconds": null}]}]
> }
> ```
>
> Return only the completed JSON, no explanation.

---

3. Claude will return a completed JSON block. Copy it.
4. In Supabase, go to **Table Editor → recipes → Insert row**, paste the relevant fields, or ask a developer to run an INSERT statement.

**Option B: Claude Code (for developers)**

If you have Claude Code installed, you can ask it to insert the recipe directly:

> Using the Supabase client already configured in this project, fetch the recipe from [URL], parse it into the app's recipe JSON format, and insert it into the recipes table for user_id [your-user-id]. Use the existing supabase client in src/lib/supabase.js.

---

### Extracting a recipe from a URL — ChatGPT

1. Go to [chatgpt.com](https://chatgpt.com) and start a new conversation.
2. Use this prompt:

---

> I want to add a recipe to my recipe app. Please read the recipe at this URL and convert it to the JSON format I'll give you. Rules:
> - Keep ingredient names in their original language.
> - `amount` must always be a number (not a string). Convert fractions: ½ = 0.5, ¼ = 0.25, ⅓ = 0.33.
> - `unit` is a short abbreviation like "g", "ml", "el", "tl", "kop", "stuk", or null if the ingredient has no unit.
> - `id` values: use "ing_1", "ing_2", etc. for ingredients and "step_1", "step_2", etc. for steps.
> - If the recipe has separate components (e.g. "for the sauce"), use the `group` field with a label; otherwise set `group` to null.
> - `timer_seconds`: if a step mentions a specific time (e.g. "cook for 10 minutes"), set this to the number of seconds; otherwise null.
> - `note` on ingredients: only fill this in if the original recipe specifies a brand or a specific variant (e.g. "preferably full-fat"). Otherwise null.
> - Return only the JSON, nothing else.
>
> URL: **[PASTE YOUR URL HERE]**
>
> ```json
> {
>   "title": "",
>   "tagline": "",
>   "category": "",
>   "subcategory": "",
>   "servings": null,
>   "total_minutes": null,
>   "freezer_friendly": null,
>   "notes": "",
>   "tags": [],
>   "ingredients": [{"group": null, "items": [{"id": "", "amount": null, "unit": null, "name": "", "note": null}]}],
>   "steps": [{"group": null, "items": [{"id": "", "content": "", "timer_seconds": null}]}]
> }
> ```

---

3. Copy the returned JSON.

---

### Extracting a recipe from text (no URL)

If you have a recipe on paper, in a PDF, or copied from somewhere, use this prompt instead:

---

> Convert the following recipe text to the JSON structure below. Rules are: amount must be a number (convert fractions to decimals), unit is a short abbreviation or null, IDs are "ing_1" etc. and "step_1" etc., note is null unless the text specifies a brand or tip for that specific ingredient. Return only the JSON.
>
> Recipe text:
> [PASTE RECIPE TEXT HERE]
>
> ```json
> {
>   "title": "", "tagline": "", "category": "", "subcategory": "", "servings": null,
>   "total_minutes": null, "freezer_friendly": null, "notes": "", "tags": [],
>   "ingredients": [{"group": null, "items": [{"id": "", "amount": null, "unit": null, "name": "", "note": null}]}],
>   "steps": [{"group": null, "items": [{"id": "", "content": "", "timer_seconds": null}]}]
> }
> ```

---

### Inserting the result into Supabase

Once you have the JSON from the AI:

1. Go to your Supabase project → **Table Editor** → **recipes**.
2. Click **Insert** → **Insert row**.
3. Fill in each field. For `ingredients` and `steps`, paste the JSON arrays directly into those fields.
4. Set `user_id` to your user ID (find this in **Authentication → Users** in the Supabase dashboard).
5. Click **Save**.

Alternatively, a developer can run this SQL in the Supabase SQL Editor (replace the placeholders):

```sql
insert into recipes (user_id, title, tagline, category, subcategory, servings, total_minutes, ingredients, steps, tags, notes, freezer_friendly)
values (
  'your-user-id-here',
  'Recipe title',
  'Recipe subtitle',
  'Main dishes',
  null,
  4,
  30,
  '[{"group":null,"items":[...]}]'::jsonb,
  '[{"group":null,"items":[...]}]'::jsonb,
  '{}',
  null,
  null
);
```

---

### Updating an existing recipe with a new version

If you find a better version of a recipe online, use this prompt to generate an update:

---

> I have an existing recipe in my app. I found a better version online. Please fetch the new recipe from [URL] and return a JSON patch — only include fields that changed. Use the same JSON structure as before. For ingredients and steps, return the complete new arrays (not a diff), keeping the same id format. Return only the JSON.

---

Then in Supabase, find the recipe row in the Table Editor and update the relevant fields.

---

### Populating the ingredient_tags table

The `ingredient_tags` table is what powers the allergen badges and diet filters. Each row maps a canonical ingredient name to an array of allergen/diet tags. The allowed tag values are:

| Tag | Meaning |
| --- | --- |
| `meat` | Beef, pork, chicken, lamb, and other animal meat |
| `fish` | All fish |
| `shellfish` | Prawns, crab, lobster, mussels, etc. |
| `dairy` | Milk, cheese, butter, cream, yoghurt |
| `gluten` | Wheat, rye, barley, spelt, and products made from them (pasta, bread, flour) |
| `egg` | Chicken eggs and products containing eggs |
| `nuts` | Tree nuts (almonds, walnuts, cashews, etc.) and peanuts |

**Prompting AI to generate ingredient_tags rows:**

Use this prompt in Claude or ChatGPT to generate a batch of INSERT statements:

---

> I have a recipe app with an ingredient_tags table. It maps ingredient names to allergen/diet tags. The allowed tags are: meat, fish, shellfish, dairy, gluten, egg, nuts.
>
> Please generate SQL INSERT statements for the following ingredients. Use the exact ingredient name as the canonical_name (lowercase, in the language of my app). Each row should look like:
> `INSERT INTO ingredient_tags (canonical_name, tags) VALUES ('name', ARRAY['tag1','tag2']) ON CONFLICT (canonical_name) DO NOTHING;`
>
> Ingredients to classify:
> [LIST YOUR INGREDIENT NAMES HERE, ONE PER LINE]
>
> Return only the SQL statements, nothing else. If an ingredient has no allergens (e.g. a vegetable), use an empty array `ARRAY[]::text[]`.

---

Copy the output and run it in the Supabase SQL Editor. The `ON CONFLICT DO NOTHING` clause means it is safe to run multiple times without creating duplicates.

**Example output:**

```sql
INSERT INTO ingredient_tags (canonical_name, tags) VALUES ('kipfilet',     ARRAY['meat'])              ON CONFLICT (canonical_name) DO NOTHING;
INSERT INTO ingredient_tags (canonical_name, tags) VALUES ('rundvlees',    ARRAY['meat'])              ON CONFLICT (canonical_name) DO NOTHING;
INSERT INTO ingredient_tags (canonical_name, tags) VALUES ('zalm',         ARRAY['fish'])              ON CONFLICT (canonical_name) DO NOTHING;
INSERT INTO ingredient_tags (canonical_name, tags) VALUES ('garnalen',     ARRAY['shellfish'])         ON CONFLICT (canonical_name) DO NOTHING;
INSERT INTO ingredient_tags (canonical_name, tags) VALUES ('mozzarella',   ARRAY['dairy'])             ON CONFLICT (canonical_name) DO NOTHING;
INSERT INTO ingredient_tags (canonical_name, tags) VALUES ('pasta',        ARRAY['gluten'])            ON CONFLICT (canonical_name) DO NOTHING;
INSERT INTO ingredient_tags (canonical_name, tags) VALUES ('ei',           ARRAY['egg'])               ON CONFLICT (canonical_name) DO NOTHING;
INSERT INTO ingredient_tags (canonical_name, tags) VALUES ('amandelen',    ARRAY['nuts'])              ON CONFLICT (canonical_name) DO NOTHING;
INSERT INTO ingredient_tags (canonical_name, tags) VALUES ('courgette',    ARRAY[]::text[])            ON CONFLICT (canonical_name) DO NOTHING;
INSERT INTO ingredient_tags (canonical_name, tags) VALUES ('knoflook',     ARRAY[]::text[])            ON CONFLICT (canonical_name) DO NOTHING;
```

---

### Keeping ingredient_tags up to date

As you add new recipes, new ingredient names will appear that aren't in the reference table yet. The best way to keep the table current is to:

1. Periodically export the list of unique ingredient names from Supabase:

```sql
select distinct lower(item->>'name') as ingredient_name
from recipes,
     jsonb_array_elements(ingredients) as ig,
     jsonb_array_elements(ig->'items') as item
where lower(item->>'name') not in (select lower(canonical_name) from ingredient_tags)
order by 1;
```

2. Copy the result (a list of names), paste it into the AI prompt above, and run the generated INSERT statements.

You only need to do this occasionally — allergen badges simply won't appear for unclassified ingredients, which is fine.

---

### Tips for better AI results

- **Be specific about language**: if your recipes are in Dutch, tell the AI "keep ingredient names in Dutch". If they are in English, say so. This prevents the AI from translating.
- **Give an example**: if the AI's first attempt isn't quite right, paste one correct example row and say "follow this format exactly".
- **Check amounts**: AI sometimes writes amounts as strings (`"2"`) instead of numbers (`2`). If the app shows a blank amount, this is the cause — go back to the AI and say "ensure all amount values are numbers, not strings".
- **Verify IDs are unique**: if you are adding multiple recipes at once, make sure the `id` values don't collide. Using `"recipe-title_ing_1"` as a prefix helps.
- **Use Claude for longer recipes**: Claude handles longer context better and tends to be more accurate with structured data formats than ChatGPT for recipes with many ingredients or steps.
