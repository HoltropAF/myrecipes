// Demo data for guest mode. Mirrors the shape of real Supabase rows so every view
// (Recipes, Stats, Meal Prep, Recipe Detail) works unmodified against it.
// Nothing here is ever written back to a database — guest mode is entirely in-memory.

const day = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() - offset)
  return d.toISOString().slice(0, 10)
}

export const DEMO_RECIPES = [
  {
    id: 'demo-bruschetta', title: 'Bruschetta', tagline: 'Italiaans recept',
    category: 'Appetizers & Snacks', subcategory: null, servings: null, total_minutes: null,
    ingredients: [{ group: null, items: [
      { id: 'i1', name: 'sneetjes stokbrood', unit: null, amount: 4 },
      { id: 'i2', name: 'rijpe tomaten', unit: null, amount: 4 },
      { id: 'i3', name: 'knoflook, doormidden gesneden', unit: 'teen', amount: 1 },
      { id: 'i4', name: 'paar takjes basilicum', unit: null, amount: null },
      { id: 'i5', name: 'extra vergine olijfolie', unit: 'el', amount: 1 },
      { id: 'i6', name: 'peper en zout', unit: null, amount: null },
    ] }],
    steps: [{ group: 'Bereiding', items: [
      { id: 's1', content: 'Rooster of gril de sneetjes stokbrood tot goudbruin. Als ze nog warm zijn, wrijf je ze even in met de doorgesneden knoflook.', timer_seconds: null },
      { id: 's2', content: 'Pak een kom. Snijd de tomaat in kleine stukjes. Hak de basilicum in dunne reepjes. Voeg de tomaat, basilicum, het zout, de peper en de olijfolie toe aan de kom en hussel alles goed door elkaar.', timer_seconds: null },
      { id: 's3', content: 'Beleg de gegrilde sneetjes stokbrood met het mengsel van fijngesneden tomaat, basilicum, olijfolie, zout en peper.', timer_seconds: null },
    ] }],
    variants: [], notes: 'Make-ahead/storage: Tomato topping keeps 2 days in the fridge (add basil just before serving). Toasted bread keeps 2 days at room temp or freezes up to a month.',
    source: null, photo_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bruschetta.jpg',
    calories: 669, protein_g: 18.3, carbs_g: 99.3, fat_g: 21.4, nutrition_is_estimate: true,
    wishlist: false, freezer_friendly: null, tags: [], created_at: day(120),
  },
  {
    id: 'demo-spanakopita', title: 'Spanakopita', tagline: 'Griekse spinazietaart met filodeeg',
    category: 'Appetizers & Snacks', subcategory: null, servings: null, total_minutes: null,
    ingredients: [{ group: null, items: [
      { id: 'i1', name: 'vellen filodeeg, ontdooid', unit: null, amount: 6 },
      { id: 'i2', name: 'verse of diepgevroren spinazie', unit: 'kg', amount: 1 },
      { id: 'i3', name: 'feta, verkruimeld', unit: 'g', amount: 350 },
      { id: 'i4', name: 'eieren, los geklutst', unit: null, amount: 2 },
      { id: 'i5', name: 'Zout & peper, naar smaak', unit: null, amount: null },
      { id: 'i6', name: 'Dille, naar smaak', unit: null, amount: null },
      { id: 'i7', name: 'Olijfolie', unit: null, amount: null },
    ] }],
    steps: [{ group: 'Bereiding', items: [
      { id: 's1', content: 'Haal het filodeeg uit de vriezer en bewaar tot je het gebruikt onder een vochtige theedoek. Verwarm de oven voor op 200 graden.', timer_seconds: null },
      { id: 's2', content: 'Bak de spinazie tot het mooi geslonken is en knijp al het vocht eruit. Snij de spinazie grof en meng met de feta, dille en 2 geklutste eieren. Breng op smaak met zout en peper.', timer_seconds: null },
      { id: 's3', content: 'Bekleed een ingevette ovenschaal met vellen filodeeg, bestrijk elke laag met olijfolie.', timer_seconds: null },
      { id: 's4', content: 'Verdeel het spinaziemengsel eroverheen en strijk dit mooi plat. Maak af met nog 3 vellen filodeeg.', timer_seconds: null },
      { id: 's5', content: 'Bak ongeveer 20 minuten, totdat het filodeeg goudbruin is.', timer_seconds: null },
    ] }],
    variants: [], notes: 'Freezes well both ways: unbaked (wrap tightly, bake from frozen adding 5-10 min) or baked (cool, wrap, freeze up to 1 month).',
    source: null, photo_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Spanakopita.jpg',
    calories: 1572, protein_g: 50.0, carbs_g: 186.0, fat_g: 74.0, nutrition_is_estimate: true,
    wishlist: true, freezer_friendly: true, tags: ['freezes well'], created_at: day(95),
  },
  {
    id: 'demo-pompoencurry', title: 'Pompoencurry met kikkererwten', tagline: 'Lactose en glutenvrij',
    category: 'Main dishes', subcategory: 'Curry', servings: 4, total_minutes: 40,
    ingredients: [{ group: null, items: [
      { id: 'i1', name: 'middelgrote pompoen', unit: null, amount: 1 },
      { id: 'i2', name: 'tomatenblokjes uit blik', unit: 'g', amount: 400 },
      { id: 'i3', name: 'kikkererwten uit blik', unit: 'g', amount: 400 },
      { id: 'i4', name: 'kokosmelk', unit: 'ml', amount: 400 },
      { id: 'i5', name: 'ui', unit: null, amount: 1 },
      { id: 'i6', name: 'cm gember', unit: null, amount: 3 },
      { id: 'i7', name: 'knoflook', unit: 'teen', amount: 2 },
      { id: 'i8', name: 'kerriepoeder', unit: 'el', amount: 1 },
      { id: 'i9', name: 'verse koriander', unit: null, amount: null },
    ] }],
    steps: [{ group: 'Bereiding', items: [
      { id: 's1', content: 'Snipper de ui. Hak de knoflook en de gember fijn. Was de pompoen, halveer en verwijder de pitten. Snijd in stukken van ca 3 cm.', timer_seconds: null },
      { id: 's2', content: 'Verhit in een wok wat zonnebloemolie. Fruit hierin de ui, knoflook en gember totdat de geuren vrijkomen. Voeg het kerriepoeder en de pompoen toe en bak een paar minuten mee.', timer_seconds: null },
      { id: 's3', content: 'Voeg de tomatenblokjes en de kokosmelk toe en laat het geheel in ongeveer 20-30 minuten op zacht vuur gaar worden.', timer_seconds: 1500 },
      { id: 's4', content: 'Voeg de kikkererwten toe en laat nog ongeveer 2 minuten meekoken. Breng op smaak met peper en zout.', timer_seconds: 120 },
      { id: 's5', content: 'Dien op in een schaal en garneer met verse koriander.', timer_seconds: null },
    ] }],
    variants: [], notes: 'Tip: serveer met naanbrood of flatbread.\n\nMake-ahead/freeze: Freezes very well for up to 3 months.',
    source: null, photo_url: null,
    calories: 1588, protein_g: 45.3, carbs_g: 134.6, fat_g: 106.4, nutrition_is_estimate: true,
    wishlist: false, freezer_friendly: true, tags: ['freezes well'], created_at: day(80),
  },
  {
    id: 'demo-baklava', title: 'Baklava', tagline: 'Een van de beste dingen in je leven',
    category: 'Desserts', subcategory: null, servings: null, total_minutes: null,
    ingredients: [{ group: null, items: [
      { id: 'i1', name: 'boter', unit: 'g', amount: 100 },
      { id: 'i2', name: 'ongezouten pistachenoten', unit: 'g', amount: 100 },
      { id: 'i3', name: 'walnoten', unit: 'g', amount: 150 },
      { id: 'i4', name: 'lichte basterdsuiker', unit: 'g', amount: 25 },
      { id: 'i5', name: 'kaneel', unit: 'tl', amount: 1 },
      { id: 'i6', name: 'vellen filodeeg, ontdooid', unit: null, amount: 10 },
      { id: 'i7', name: 'water', unit: 'ml', amount: 130 },
      { id: 'i8', name: 'suiker', unit: 'g', amount: 170 },
      { id: 'i9', name: 'honing', unit: 'ml', amount: 50 },
      { id: 'i10', name: 'schil van sinaasappel', unit: 'stuk', amount: 1 },
    ] }],
    steps: [{ group: 'Bereiding', items: [
      { id: 's1', content: 'Verwarm de oven voor op 170°C en smelt de boter.', timer_seconds: null },
      { id: 's2', content: 'Hak de pistachenoten en walnoten fijn. Mix met de basterdsuiker en kaneel.', timer_seconds: null },
      { id: 's3', content: 'Vet een ovenschaal in met boter. Laag het filodeeg en de boter, alternerend, totdat de helft van het deeg is gebruikt.', timer_seconds: null },
      { id: 's4', content: 'Verdeel het notenmengsel erover, bedek met filodeeg en boter, herhaal tot al het deeg is gebruikt.', timer_seconds: null },
      { id: 's5', content: 'Bak 35 minuten of tot de bovenkant goudbruin en krokant is.', timer_seconds: 2100 },
      { id: 's6', content: 'Giet de hete siroop erover en laat volledig afkoelen.', timer_seconds: null },
    ] }],
    variants: [], notes: 'Make-ahead/storage: Actually improves after a day or two. Keeps well at room temp for about a week, or freeze for up to 2-3 months.',
    source: null, photo_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Baklava ST 06.JPG',
    calories: 3124, protein_g: 36.1, carbs_g: 486.1, fat_g: 121.0, nutrition_is_estimate: true,
    wishlist: false, freezer_friendly: true, tags: ['freezes well'], created_at: day(60),
  },
  {
    id: 'demo-tiramisu', title: 'Tiramisu', tagline: 'Om misselijk van te worden, zo goed',
    category: 'Desserts', subcategory: null, servings: 8, total_minutes: 30,
    ingredients: [{ group: null, items: [
      { id: 'i1', name: 'eiwit', unit: null, amount: 3 },
      { id: 'i2', name: 'suiker', unit: 'g', amount: 150 },
      { id: 'i3', name: 'eidooiers', unit: null, amount: 3 },
      { id: 'i4', name: 'mascarpone', unit: 'g', amount: 400 },
      { id: 'i5', name: 'lange vingers', unit: 'g', amount: 200 },
      { id: 'i6', name: 'amandellikeur', unit: 'ml', amount: 50 },
      { id: 'i7', name: 'koude koffie', unit: 'ml', amount: 175 },
      { id: 'i8', name: 'pure chocolade', unit: 'g', amount: 200 },
      { id: 'i9', name: 'cacaopoeder', unit: null, amount: null },
    ] }],
    steps: [{ group: 'Bereiding', items: [
      { id: 's1', content: 'Klop de eiwitten met de helft van de suiker tot stijve pieken.', timer_seconds: null },
      { id: 's2', content: 'Klop de eidooiers met de resterende suiker schuimig.', timer_seconds: null },
      { id: 's3', content: 'Roer de mascarpone los en meng de eidooiers erdoor. Spatel het eiwit erdoor.', timer_seconds: null },
      { id: 's4', content: 'Bedek de bodem van een ovenschaal met lange vingers en kwast ze in met het koffiemengsel.', timer_seconds: null },
      { id: 's5', content: 'Schep de helft van het mascarponemengsel erover en rasp er chocolade op. Herhaal de laag.', timer_seconds: null },
      { id: 's6', content: 'Laat de tiramisu minstens een paar uur opstijven in de koelkast.', timer_seconds: null },
    ] }],
    variants: [
      { id: 'v1', label: 'Limoncello', ingredients: [{ group: null, items: [
        { id: 'tv1-i1', name: 'slagroom', unit: 'ml', amount: 200 },
        { id: 'tv1-i2', name: 'mascarpone', unit: 'g', amount: 250 },
        { id: 'tv1-i3', name: 'limoncello', unit: 'ml', amount: 100 },
        { id: 'tv1-i4', name: 'lange vingers', unit: 'g', amount: 100 },
      ] }], steps: [{ group: 'Bereiding', items: [
        { id: 'tv1-s1', content: 'Klop de slagroom stijf met mascarpone en poedersuiker.', timer_seconds: null },
        { id: 'tv1-s2', content: 'Dip de lange vingers kort in limoncello en laag op met het mengsel.', timer_seconds: null },
      ] }] },
      { id: 'v2', label: 'Pistache', ingredients: [{ group: null, items: [
        { id: 'tv2-i1', name: 'pistachenoten', unit: 'g', amount: 100 },
        { id: 'tv2-i2', name: 'pistachepasta', unit: 'g', amount: 200 },
        { id: 'tv2-i3', name: 'mascarpone', unit: 'g', amount: 500 },
      ] }], steps: [{ group: 'Bereiding', items: [
        { id: 'tv2-s1', content: 'Rooster de pistachenoten, laat afkoelen.', timer_seconds: null },
        { id: 'tv2-s2', content: 'Mix de mascarpone en pistachepasta tot een gladde massa, laag op met koffie-gedoopte koekjes.', timer_seconds: null },
      ] }] },
    ],
    notes: 'Make-ahead: Best made 1 day ahead. Not recommended to freeze (raw egg/mascarpone texture suffers).',
    source: null, photo_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tiramisu.jpg',
    calories: 3471, protein_g: 30.0, carbs_g: 288.0, fat_g: 250.0, nutrition_is_estimate: true,
    wishlist: true, freezer_friendly: false, tags: [], created_at: day(45),
  },
  {
    id: 'demo-baobuns', title: 'Bao buns - gochujangbloemkool', tagline: 'Van deze fluffy broodjes blijf je dooreten',
    category: 'Main dishes', subcategory: null, servings: 4, total_minutes: 60,
    ingredients: [
      { group: 'Bao buns zelf maken', items: [
        { id: 'i1', name: 'zelfrijzend bakmeel', unit: 'g', amount: 250 },
        { id: 'i2', name: 'zout', unit: 'tl', amount: 1 },
        { id: 'i3', name: 'bakpoeder', unit: 'tl', amount: 1 },
        { id: 'i4', name: 'halfvolle melk', unit: 'ml', amount: 200 },
        { id: 'i5', name: 'sesamolie', unit: 'el', amount: 2 },
      ] },
      { group: 'Vulling', items: [
        { id: 'i6', name: 'bloemkoolkrop', unit: null, amount: 1 },
        { id: 'i7', name: 'botersla', unit: null, amount: null },
        { id: 'i8', name: 'gochujang', unit: 'el', amount: 0.5 },
        { id: 'i9', name: 'agavesiroop', unit: 'el', amount: 1 },
        { id: 'i10', name: 'Kewpie mayonaise', unit: null, amount: null },
      ] },
    ],
    steps: [
      { group: 'Bao buns', items: [
        { id: 's1', content: 'Meng het zelfrijzend bakmeel, zout, bakpoeder en de melk in een kom. Roer tot een samenhangend deeg ontstaat.', timer_seconds: null },
        { id: 's2', content: 'Kneed het deeg met bebloemde handen ongeveer 5 minuten tot een soepel deeg.', timer_seconds: 300 },
        { id: 's3', content: 'Verdeel het deeg in 12 gelijke balletjes en rol elk uit. Stoom de buns afgedekt in 10 minuten gaar.', timer_seconds: 600 },
      ] },
      { group: 'Vulling', items: [
        { id: 's4', content: 'Verwarm de oven voor op 200°C en snij de bloemkool in roosjes. Rooster 20 minuten in de oven.', timer_seconds: 1200 },
        { id: 's5', content: 'Meng de bloemkool met gochujang, sojasaus en agavesiroop, nog 10 minuten in de oven.', timer_seconds: 600 },
      ] },
      { group: 'Laatste stappen', items: [
        { id: 's6', content: 'Open de broodjes, beleg met sla, gochujangbloemkool en japanse mayonaise naar smaak.', timer_seconds: null },
      ] },
    ],
    variants: [], notes: 'Make-ahead/freeze: Steamed buns freeze very well — freeze plain (unfilled) buns after steaming, then re-steam straight from frozen for 8-10 minutes.',
    source: null, photo_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pork Belly Bun.jpg',
    calories: 773, protein_g: 4.2, carbs_g: 17.1, fat_g: 78.0, nutrition_is_estimate: true,
    wishlist: false, freezer_friendly: true, tags: ['freezes well'], created_at: day(30),
  },
  {
    id: 'demo-soup', title: 'Sausage potato soup', tagline: 'Heel veel cream',
    category: 'Soups & Salads', subcategory: null, servings: 6, total_minutes: 45,
    ingredients: [{ group: null, items: [
      { id: 'i1', name: 'Italian sausage, mild or hot', unit: 'g', amount: 906 },
      { id: 'i2', name: 'unsalted butter, divided', unit: 'g', amount: 140 },
      { id: 'i3', name: 'diced carrots', unit: 'cup', amount: 0.75 },
      { id: 'i4', name: 'diced celery', unit: 'cup', amount: 0.75 },
      { id: 'i5', name: 'chopped baby gold potatoes', unit: 'g', amount: 1272 },
      { id: 'i6', name: 'chicken stock', unit: 'g', amount: 1992 },
      { id: 'i7', name: 'milk', unit: 'g', amount: 1416 },
      { id: 'i8', name: 'heavy cream', unit: 'g', amount: 240 },
      { id: 'i9', name: 'freshly shredded extra-sharp cheddar cheese', unit: 'g', amount: 940 },
    ] }],
    steps: [{ group: 'Bereiding', items: [
      { id: 's1', content: 'Add sausage, sear briefly, then crumble and cook until browned.', timer_seconds: null },
      { id: 's2', content: 'Melt butter in the pot. Add carrots, celery, and onion; sauté until softened.', timer_seconds: null },
      { id: 's3', content: 'Stir in potatoes and chicken stock, bring to a boil, then simmer 15–20 minutes.', timer_seconds: 1200 },
      { id: 's4', content: 'Make a roux with butter and flour, whisk in milk until thickened, stir in cream.', timer_seconds: null },
      { id: 's5', content: 'Combine with the soup, add cheese gradually, stirring until melted. Serve warm.', timer_seconds: null },
    ] }],
    variants: [], notes: 'Storage: fridge 3-4 days airtight, or freeze flat in a freezer bag.',
    source: null, photo_url: null,
    calories: 13699, protein_g: 963.1, carbs_g: 263.1, fat_g: 972.3, nutrition_is_estimate: true,
    wishlist: false, freezer_friendly: null, tags: ['nice cold'], created_at: day(20),
  },
  {
    id: 'demo-chili', title: 'Chili con Carne', tagline: 'Zonder enge dingen',
    category: 'Main dishes', subcategory: null, servings: 4, total_minutes: 50,
    ingredients: [{ group: null, items: [
      { id: 'i1', name: 'rode ui, gesnipperd', unit: null, amount: 1 },
      { id: 'i2', name: 'rode paprikas, in stukjes', unit: null, amount: 2 },
      { id: 'i3', name: 'cayennepeper', unit: 'tl', amount: 1 },
      { id: 'i4', name: 'gehakt', unit: 'g', amount: 400 },
      { id: 'i5', name: 'passata', unit: 'ml', amount: 500 },
      { id: 'i6', name: 'witte rijst (of afbak broodjes)', unit: 'g', amount: 350 },
      { id: 'i7', name: 'kidneybonen van 400 g, afgespoeld en uitgelekt', unit: 'blik', amount: 1 },
      { id: 'i8', name: 'pure chocolade, in stukjes', unit: 'g', amount: 20 },
    ] }],
    steps: [{ group: 'Bereiding', items: [
      { id: 's1', content: 'Fruit de rode ui en koriandersteeltjes 5 minuten op laag vuur. Roerbak de rode paprika 5 minuten mee.', timer_seconds: null },
      { id: 's2', content: 'Strooi de kruiden erover en bak 1 minuut mee. Schep het gehakt erdoor en bak op hoog vuur snel rul en bruin.', timer_seconds: null },
      { id: 's3', content: 'Giet de passata in de pan en breng aan de kook. Laat 30 minuten zonder deksel pruttelen.', timer_seconds: 1800 },
      { id: 's4', content: 'Kook intussen de witte rijst volgens de aanwijzingen op de verpakking.', timer_seconds: null },
      { id: 's5', content: 'Voeg de kidneybonen en chocolade toe. Geef het nog 10-15 minuten terwijl je af en toe roert.', timer_seconds: 750 },
    ] }],
    variants: [], notes: 'Voor vega: laat het gehakt weg en voeg wat extra bonen toe.\n\nMake-ahead/freeze: Freezes excellently for up to 3 months and often tastes even better the next day.',
    source: null, photo_url: 'https://commons.wikimedia.org/wiki/Special:FilePath/Chili con carne with beef, beans, chili peppers, garlic, black pepper, and a soft-boiled egg - Massachusetts.jpg',
    calories: 2025, protein_g: 126.3, carbs_g: 208.5, fat_g: 77.3, nutrition_is_estimate: true,
    wishlist: false, freezer_friendly: true, tags: ['freezes well'], created_at: day(10),
  },
]

// Fabricated cook log entries so Stats has real-looking data to show in guest mode.
export const DEMO_COOK_LOG = [
  { id: 'log1', recipe_id: 'demo-chili', cooked_date: day(8), thumbs: 'up', notes: 'Even lekkerder de volgende dag', variant_label: null },
  { id: 'log2', recipe_id: 'demo-chili', cooked_date: day(35), thumbs: 'up', notes: null, variant_label: null },
  { id: 'log3', recipe_id: 'demo-baobuns', cooked_date: day(25), thumbs: 'up', notes: 'Bloemkool iets langer roosteren', variant_label: null },
  { id: 'log4', recipe_id: 'demo-tiramisu', cooked_date: day(40), thumbs: 'up', notes: null, variant_label: 'Limoncello' },
  { id: 'log5', recipe_id: 'demo-tiramisu', cooked_date: day(70), thumbs: 'up', notes: 'Klassieke versie blijft de favoriet', variant_label: null },
  { id: 'log6', recipe_id: 'demo-bruschetta', cooked_date: day(15), thumbs: 'up', notes: null, variant_label: null },
  { id: 'log7', recipe_id: 'demo-bruschetta', cooked_date: day(60), thumbs: 'down', notes: 'Tomaten waren niet rijp genoeg', variant_label: null },
  { id: 'log8', recipe_id: 'demo-pompoencurry', cooked_date: day(50), thumbs: 'up', notes: null, variant_label: null },
  { id: 'log9', recipe_id: 'demo-spanakopita', cooked_date: day(90), thumbs: 'up', notes: null, variant_label: null },
  { id: 'log10', recipe_id: 'demo-soup', cooked_date: day(18), thumbs: 'up', notes: 'Extra kaas erbij', variant_label: null },
]

export const DEMO_SHOPPING_LIST = []

export const DEMO_MEAL_GROUPS = [
  { id: 'demo-group-1', name: 'Weekend bakdag', notes: 'Twee desserts, één middag', recipe_ids: ['demo-baklava', 'demo-tiramisu'] },
]
