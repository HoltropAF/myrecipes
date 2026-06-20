// Rough nutrition estimation from ingredient names + amounts.
// This is NOT a precise nutrition database — it's a best-effort keyword match against
// common per-100g values for frequently used ingredients, scaled by amount/unit.
// Always flagged as an estimate (nutrition_is_estimate = true) in the UI.

// Per 100g (or per 100ml for liquids): { calories, protein_g, carbs_g, fat_g }
const NUTRITION_PER_100 = [
  // Proteins
  { match: /kipfilet|chicken breast|chicken fillet/i, cal: 165, p: 31, c: 0, f: 3.6 },
  { match: /kip(?!cor)|chicken/i, cal: 200, p: 27, c: 0, f: 10 },
  { match: /rundvlees|beef|rib|short rib|sukade/i, cal: 250, p: 26, c: 0, f: 17 },
  { match: /gehakt|ground beef|ground turkey|ground chicken|ground pork/i, cal: 230, p: 20, c: 0, f: 17 },
  { match: /varkensvlees|pork belly|pork shoulder|spek|bacon|bacon|spekjes/i, cal: 400, p: 14, c: 0, f: 38 },
  { match: /zalm|salmon/i, cal: 208, p: 20, c: 0, f: 13 },
  { match: /tofu/i, cal: 76, p: 8, c: 2, f: 4.8 },
  { match: /shrimp|garnaal|garnalen/i, cal: 99, p: 24, c: 0, f: 0.3 },
  { match: /ei(eren|tje)?\b|^egg|eggs/i, cal: 155, p: 13, c: 1.1, f: 11 },
  { match: /worst|sausage|rookworst|chorizo/i, cal: 320, p: 17, c: 2, f: 27 },

  // Dairy / cheese
  { match: /kaas|cheese/i, cal: 380, p: 25, c: 1.3, f: 31 },
  { match: /mascarpone/i, cal: 450, p: 5, c: 4, f: 47 },
  { match: /mozzarella/i, cal: 280, p: 22, c: 2, f: 21 },
  { match: /feta/i, cal: 264, p: 14, c: 4, f: 21 },
  { match: /room|cream|slagroom|kookroom/i, cal: 340, p: 2, c: 3, f: 36 },
  { match: /crème fraîche|creme fraiche/i, cal: 290, p: 2, c: 3, f: 30 },
  { match: /yoghurt|yogurt/i, cal: 60, p: 4, c: 5, f: 3 },
  { match: /melk|milk/i, cal: 50, p: 3.4, c: 5, f: 1.6 },
  { match: /boter|butter/i, cal: 717, p: 0.9, c: 0.1, f: 81 },
  { match: /mayonaise|mayo/i, cal: 680, p: 1, c: 1, f: 75 },

  // Carbs / starches
  { match: /pasta|tagliatelle|lasagne/i, cal: 131, p: 5, c: 25, f: 1.1 },
  { match: /rijst|rice/i, cal: 130, p: 2.7, c: 28, f: 0.3 },
  { match: /aardappel|potato/i, cal: 77, p: 2, c: 17, f: 0.1 },
  { match: /brood|bread|baguette|stokbrood|naan|pita|tortilla|wrap/i, cal: 265, p: 9, c: 49, f: 3.2 },
  { match: /bloem|flour/i, cal: 364, p: 10, c: 76, f: 1 },
  { match: /suiker|sugar/i, cal: 387, p: 0, c: 100, f: 0 },
  { match: /noedels|noodles/i, cal: 138, p: 4.5, c: 25, f: 2 },
  { match: /filodeeg|phyllo|bladerdeeg|puff pastry|deeg/i, cal: 300, p: 7, c: 50, f: 8 },

  // Vegetables / fruit
  { match: /ui|onion/i, cal: 40, p: 1.1, c: 9, f: 0.1 },
  { match: /knoflook|garlic/i, cal: 149, p: 6.4, c: 33, f: 0.5 },
  { match: /tomaat|tomato/i, cal: 18, p: 0.9, c: 3.9, f: 0.2 },
  { match: /paprika|pepper/i, cal: 31, p: 1, c: 6, f: 0.3 },
  { match: /courgette|zucchini/i, cal: 17, p: 1.2, c: 3.1, f: 0.3 },
  { match: /spinazie|spinach/i, cal: 23, p: 2.9, c: 3.6, f: 0.4 },
  { match: /avocado/i, cal: 160, p: 2, c: 9, f: 15 },
  { match: /aubergine|eggplant/i, cal: 25, p: 1, c: 6, f: 0.2 },
  { match: /komkommer|cucumber/i, cal: 15, p: 0.7, c: 3.6, f: 0.1 },
  { match: /wortel|carrot/i, cal: 41, p: 0.9, c: 10, f: 0.2 },
  { match: /mango/i, cal: 60, p: 0.8, c: 15, f: 0.4 },
  { match: /banaan|banana/i, cal: 89, p: 1.1, c: 23, f: 0.3 },

  // Oils / fats
  { match: /olijfolie|olive oil|zonnebloemolie|vegetable oil|sesame oil|oil/i, cal: 884, p: 0, c: 0, f: 100 },

  // Legumes
  { match: /kikkererwten|chickpea/i, cal: 164, p: 8.9, c: 27, f: 2.6 },
  { match: /bonen|beans/i, cal: 127, p: 8.7, c: 23, f: 0.5 },

  // Misc / sauces
  { match: /pesto/i, cal: 450, p: 5, c: 5, f: 45 },
  { match: /kokosmelk|coconut milk/i, cal: 230, p: 2.3, c: 6, f: 24 },
  { match: /chocolade|chocolate/i, cal: 545, p: 5, c: 61, f: 31 },
  { match: /honing|honey/i, cal: 304, p: 0.3, c: 82, f: 0 },
]

// Approximate gram weight for common non-weight units
const UNIT_TO_GRAMS = {
  g: 1, kg: 1000, ml: 1, l: 1000,
  el: 15, tbsp: 15, tl: 5, tsp: 5,
  stuk: 50, stuks: 50, teen: 4,
  kop: 240, cup: 240, oz: 28.35, lb: 453.6,
  blik: 400, pak: 250, zak: 200, pot: 200, blok: 100,
}

function estimateGrams(item) {
  if (item.amount === null || item.amount === undefined) return 50 // unknown quantity fallback
  const unit = (item.unit || '').toLowerCase()
  if (UNIT_TO_GRAMS[unit]) return item.amount * UNIT_TO_GRAMS[unit]
  // No unit at all (e.g. "2 eieren") - assume count-based, ~50g each as a rough default
  return item.amount * 50
}

/**
 * Estimate total nutrition for a recipe from its ingredient groups.
 * Returns { calories, protein_g, carbs_g, fat_g } as TOTALS for the whole recipe.
 */
export function estimateNutrition(ingredientGroups) {
  let totalCal = 0, totalP = 0, totalC = 0, totalF = 0
  let matchedAny = false

  for (const group of ingredientGroups || []) {
    for (const item of group.items || []) {
      const entry = NUTRITION_PER_100.find(e => e.match.test(item.name))
      if (!entry) continue
      matchedAny = true
      const grams = estimateGrams(item)
      const factor = grams / 100
      totalCal += entry.cal * factor
      totalP += entry.p * factor
      totalC += entry.c * factor
      totalF += entry.f * factor
    }
  }

  if (!matchedAny) return null

  return {
    calories: Math.round(totalCal),
    protein_g: Math.round(totalP * 10) / 10,
    carbs_g: Math.round(totalC * 10) / 10,
    fat_g: Math.round(totalF * 10) / 10,
  }
}
