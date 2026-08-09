// Supermarket aisles, so a shopping list reads in the order you actually walk.
//
// Same shape and the same bilingual caution as MAIN_INGREDIENTS in recipeTags:
// the recipes here are mostly Dutch, so English-only patterns miss most of the
// list. Order is roughly an Albert Heijn floor plan — produce at the entrance,
// freezers at the back.
//
// This is a display convenience, not a claim of fact. An unmatched ingredient
// falls into `overig` rather than being guessed at.

// Dutch builds compound nouns freely — "bloemkoolkrop", "bosui",
// "tomatenblokjes" — so most Dutch terms are matched as a prefix with a leading
// \b only. English terms keep a trailing \b, because without it "beet" matched
// inside "beetje" and quietly filed "beetje zout" under fruit & veg.
//
// Order matters and is not alphabetical. Dairy and meat come before produce
// because product names routinely mention a vegetable — "boursin knoflook &
// fijne kruiden" is cheese, not garlic. Spices come before produce for the same
// reason: "black pepper" is not a bell pepper.
export const AISLES = [
  {
    // Checked first: a prepared or tinned product belongs with the cupboard
    // goods even though its name leads with a fresh ingredient
    // ("champignonroomsoep", "tomatenblik").
    key: 'voorraad',
    match: /(soep|blikje?\b|potje\b)|\b(soup|tinned|canned|jar of)\b/i,
  },
  {
    key: 'brood',
    match: /\b(brood|bagel|stokbrood|ciabatta|pita|wrap|tortilla|naan|bao|beschuit|cracker|croissant|bladerdeeg|filodeeg|pizzabodem|taartbodem|panko|paneermeel)|\b(bread|baguette|pitta|puff pastry|filo|phyllo|breadcrumbs?|pastry)\b/i,
  },
  {
    key: 'zuivel',
    match: /\b(melk|karnemelk|room|slagroom|kookroom|creme fraiche|crème fraîche|zure room|yoghurt|kwark|boter|margarine|eieren|kaas|parmezaan|mozzarella|feta|mascarpone|ricotta|boursin|manchego|cheddar|brie)|\b(milk|buttermilk|cream|sour cream|yoghurt|yogurt|butter|eggs?|cheese|parmesan|mozzarella|feta|mascarpone|ricotta|cheddar)\b|\bei\b/i,
  },
  {
    key: 'vlees',
    match: /\b(kip|kalkoen|gehakt|rundvlees|biefstuk|sukade|riblap|varkensvlees|procureur|spek|bacon|worst|chorizo|salami|ham|schnitzel|lamsvlees|zalm|kabeljauw|tonijn|garnaal|garnalen|mossel|inktvis|parmaham)|\b(chicken|turkey|beef|steak|mince|pork|bacon|sausage|chorizo|salami|ham|lamb|salmon|cod|tuna|prawns?|shrimps?|mussels?|squid|fish)\b|\bvis\b/i,
  },
  {
    key: 'kruiden',
    match: /\b(zout|peper\b|peperkorrel|paprikapoeder|komijn|koriander|kurkuma|kerrie|garam masala|kaneel|nootmuskaat|kruidnagel|laurier|tijm|rozemarijn|oregano|basilicum|peterselie|bieslook|dille|munt|chilipoeder|chilivlokken|sesamzaad|gist|bakpoeder|vanille)|bouillon|\b(salt|black pepper|white pepper|cumin|coriander|turmeric|curry powder|garam masala|cinnamon|nutmeg|cloves?|bay lea(?:f|ves)|thyme|rosemary|oregano|basil|parsley|chives?|dill|mint|chill?i (?:powder|flake)|sesame seed|yeast|baking powder|vanilla)\b/i,
  },
  {
    key: 'diepvries',
    match: /\b(diepvries|ingevroren|bevroren|ijsje|roomijs)|\b(frozen|ice cream)\b/i,
  },
  {
    key: 'groente',
    match: /\b(ui\b|uien|bosui|sjalot|knoflook|prei|wortel|winterpeen|tomaat|tomaten|komkommer|courgette|aubergine|broccoli|bloemkool|spinazie|sla\b|ijsbergsla|botersla|little gem|rucola|champignon|paddenstoel|aardappel|pompoen|venkel|selderij|bleekselderij|sperziebonen|doperwt|mais|avocado|citroen|limoen|sinaasappel|appel|peer\b|banaan|mango|ananas|aardbei|framboos|druiven|gember|witlof|asperge|radijs|rode kool|spitskool|paprika)|\b(onions?|shallots?|garlic|leeks?|carrots?|bell peppers?|sweet peppers?|tomato|tomatoes|cucumber|courgette|zucchini|aubergine|eggplant|broccoli|cauliflower|spinach|lettuce|rocket|arugula|mushrooms?|potato|potatoes|pumpkin|squash|fennel|celery|green beans?|peas?|sweetcorn|avocado|lemons?|limes?|oranges?|apples?|pears?|bananas?|mango|pineapple|berries|strawberr|raspberr|grapes?|ginger|cabbage|asparagus|radish|beetroot)\b/i,
  },
  {
    key: 'dranken',
    match: /\b(water|bruiswater|sinaasappelsap|appelsap|wijn|bier|cider|bouillon|fond|thee|koffie|cola|limonade|likeur|siroop|rum|wodka|whisky|curaçao|curacao)|\b(juice|wine|beer|cider|stock|broth|tea|coffee|liqueur|syrup|rum|vodka|gin|whisky|soda water)\b/i,
  },
  {
    key: 'voorraad',
    match: /\b(pasta|spaghetti|penne|tagliatelle|lasagne|noedels|rijst|basmati|couscous|bulgur|quinoa|linzen|bonen|kikkererwten|kokosmelk|tomatenblik|tomatenblokjes|passata|tomatenpuree|olie|azijn|sojasaus|vissaus|gochujang|sambal|ketjap|mosterd|mayonaise|ketchup|honing|suiker|bloem|maizena|noten|amandel|walnoot|cashew|pinda|rozijn|chocolade|cacao|havermout|tofu|tempeh|soep|augurk|olijf|kappertje)|\b(pasta|spaghetti|noodles?|rice|couscous|quinoa|lentils?|beans?|chickpeas?|coconut milk|passata|tomato paste|oil|vinegar|soy sauce|fish sauce|mustard|mayonnaise|ketchup|honey|sugar|flour|cornflour|cornstarch|nuts?|almonds?|walnuts?|cashews?|peanuts?|raisins?|chocolate|cocoa|oats|tofu|tempeh|soup|olives?|capers?|tinned|canned)\b/i,
  },
]

export const AISLE_ORDER = [...new Set(AISLES.map(aisle => aisle.key))].concat('overig')

/** Which aisle an ingredient name belongs to. Falls back to 'overig'. */
export function classifyAisle(name) {
  const text = String(name || '')
  if (!text.trim()) return 'overig'
  for (const aisle of AISLES) {
    if (aisle.match.test(text)) return aisle.key
  }
  return 'overig'
}

// Two different questions that look like one.
//
// PANTRY_STAPLES — "so common that sharing it means nothing". Used by meal-prep
// pairing, where onion and garlic genuinely are noise: nearly every savoury
// recipe has them, so pairing on them would suggest everything goes with
// everything. Lived in MealPrepView until now, which is why it was invisible to
// the shopping list.
export const PANTRY_STAPLES = new Set([
  'zout', 'peper', 'olijfolie', 'olie', 'water', 'suiker', 'boter', 'bloem',
  'salt', 'pepper', 'oil', 'sugar', 'butter', 'flour', 'ui', 'onion', 'knoflook', 'garlic',
])

// ALWAYS_STOCKED — "you certainly have this already". A narrower claim, and the
// right one for fading the shopping list and for deciding whether a recipe is
// makeable tonight. Onion and garlic are deliberately absent: you often do need
// to buy them, and treating them as assumed made onion recipes vanish from
// "what can I make".
export const ALWAYS_STOCKED = new Set([
  'zout', 'peper', 'olijfolie', 'olie', 'zonnebloemolie', 'water', 'suiker', 'boter', 'bloem',
  'salt', 'pepper', 'oil', 'olive oil', 'sugar', 'butter', 'flour',
])

export function isPantryStaple(normalisedName) {
  return PANTRY_STAPLES.has(String(normalisedName || '').trim())
}

export function isAlwaysStocked(normalisedName) {
  return ALWAYS_STOCKED.has(String(normalisedName || '').trim())
}
