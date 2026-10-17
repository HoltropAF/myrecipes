// All prototype screens are isolated from the real account, including writes.
const response = { data: [], error: { message: 'This is a design preview. Changes are not saved.' }, count: 0 }
function query() {
  return new Proxy({}, { get: (_, key) => key === 'then'
    ? resolve => Promise.resolve(resolve(response))
    : () => query() })
}
export const supabase = {
  from: () => query(),
  auth: { getUser: async () => ({ data: { user: null } }), getSession: async () => ({ data: { session: null } }) },
}
export const escapeLike = value => String(value).replace(/[\\%_]/g, m => `\\${m}`)
