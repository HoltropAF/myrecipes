// Main proteins / key ingredients worth filtering or grouping recipes by.
export const MAIN_INGREDIENTS = [
  { key: 'kip', label: 'Chicken', match: /kipfilet|chicken breast|chicken fillet|\bkip\b|\bchicken\b/i },
  { key: 'rundvlees', label: 'Beef', match: /rundvlees|\bbeef\b|short rib|sukade|ground beef|gehakt/i },
  { key: 'varkensvlees', label: 'Pork', match: /pork belly|pork shoulder|\bspek\b|\bbacon\b|spekjes|ground pork/i },
  { key: 'zalm', label: 'Salmon', match: /\bzalm\b|\bsalmon\b/i },
  { key: 'tofu', label: 'Tofu', match: /\btofu\b/i },
  { key: 'kikkererwten', label: 'Chickpeas', match: /kikkererwten|chickpea/i },
  { key: 'kaas', label: 'Cheese', match: /\bkaas\b|\bcheese\b|mozzarella|feta|mascarpone/i },
  { key: 'pasta', label: 'Pasta', match: /\bpasta\b|tagliatelle|lasagne/i },
  { key: 'rijst', label: 'Rice', match: /\brijst\b|\brice\b/i },
  { key: 'aardappel', label: 'Potato', match: /aardappel|\bpotato/i },
]

export function getMainIngredientKeys(recipe) {
  const allText = (recipe.ingredients || [])
    .flatMap(g => g.items || [])
    .map(item => item.name)
    .join(' | ')
  return MAIN_INGREDIENTS.filter(m => m.match.test(allText)).map(m => m.key)
}

export const ALLERGEN_LABELS = {
  meat: 'Meat', fish: 'Fish', shellfish: 'Shellfish',
  dairy: 'Dairy', gluten: 'Gluten', egg: 'Egg', nuts: 'Nuts',
}

export const DIET_TAGS = [
  { key: 'vegan', label: 'Vegan', field: 'is_vegan' },
  { key: 'vegetarian', label: 'Vegetarian', field: 'is_vegetarian' },
  { key: 'pescatarian', label: 'Pescatarian', field: 'is_pescatarian_or_better' },
]

// Meal-type buckets, inferred from category/subcategory naming already in use.
export const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', match: (r) => /breakfast|brunch/i.test(r.category || '') },
  { key: 'lunch', label: 'Lunch', match: (r) => /soup|salad|sandwich/i.test(`${r.category} ${r.subcategory}`) },
  { key: 'dinner', label: 'Dinner', match: (r) => /main dish/i.test(r.category || '') },
  { key: 'side', label: 'Side', match: (r) => /side/i.test(r.category || '') },
  { key: 'dessert', label: 'Dessert', match: (r) => /dessert|baking/i.test(r.category || '') },
  { key: 'snack', label: 'Snack', match: (r) => /appetizer|snack/i.test(r.category || '') },
  { key: 'drink', label: 'Drink', match: (r) => /drink/i.test(r.category || '') },
]
