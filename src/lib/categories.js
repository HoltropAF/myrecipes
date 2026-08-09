// The cookbook's top-level categories.
//
// A fixed editorial order, not alphabetical and not by count — set deliberately
// in 13ea63b when emoji were removed from the folders. Categories not listed
// here sort to the end alphabetically.
export const CATEGORY_ORDER = [
  'Main dishes',
  'Sides',
  'Soups',
  'Salads',
  'Breakfast & Brunch',
  'Appetizers & Snacks',
  'Desserts',
  'Drinks',
  'Household',
]

// Used as a fallback tile when a recipe has no photo. Emoji are fine here —
// this is decoration on a card, not a label in the navigation.
export const CATEGORY_ICONS = {
  'Breakfast & Brunch': '🍳', 'Appetizers & Snacks': '🥟', 'Soups & Salads': '🥗',
  'Main dishes': '🍽', 'Sides': '🍚', 'Desserts': '🍰', 'Baking': '🥐',
  'Drinks': '🍹', 'Household': '🧴', 'Soups': '🍲', 'Salads': '🥗',
}
