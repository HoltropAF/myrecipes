import { supabase } from './supabase'

export const PLANNER_BACKLOG_NAME = 'Recipes to plan'
export const PLANNER_BACKLOG_NOTE = 'myrecipes-planner-backlog-v1'

export async function rememberRecipesForPlanning(recipeIds) {
  const ids = [...new Set(recipeIds.filter(Boolean))]
  if (!ids.length) return { data: null, error: null }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const { data: backlog, error: readError } = await supabase.from('meal_groups')
    .select('id, user_id, name, notes, recipe_ids, created_at')
    .eq('user_id', user.id).eq('notes', PLANNER_BACKLOG_NOTE).limit(1).maybeSingle()
  if (readError) return { data: null, error: readError }

  const nextIds = [...new Set([...(backlog?.recipe_ids || []), ...ids])]
  if (backlog && nextIds.length === (backlog.recipe_ids || []).length) return { data: backlog, error: null }
  if (backlog) {
    return supabase.from('meal_groups').update({ recipe_ids: nextIds }).eq('id', backlog.id).eq('user_id', user.id)
      .select('id, user_id, name, notes, recipe_ids, created_at').single()
  }
  return supabase.from('meal_groups').insert({ user_id: user.id, name: PLANNER_BACKLOG_NAME, notes: PLANNER_BACKLOG_NOTE, recipe_ids: nextIds })
    .select('id, user_id, name, notes, recipe_ids, created_at').single()
}
