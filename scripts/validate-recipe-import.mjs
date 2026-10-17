import { readFile } from 'node:fs/promises'
import { parseRecipeTemplate } from '../src/lib/recipeTemplate.js'

try {
  const file = process.argv[2]
  if (!file) throw new Error('Usage: node scripts/validate-recipe-import.mjs <file>')
  const buffer = await readFile(file)
  if (buffer.length > 500000) throw new Error('Use a file smaller than 500 KB.')
  const result = parseRecipeTemplate(buffer.toString('utf8'))
  if (result.errors.length) throw new Error(result.errors.join('\n'))
  console.log(`Valid: ${result.recipes.length} recipe(s).`)
} catch (error) {
  console.error(error.message)
  process.exitCode = 1
}
