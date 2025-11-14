export const persist = (fn, { name }) => (set, get, api) => {
  const key = `__persist:${name}`

  // Build initial state from the base initializer
  const initialState = fn(set, get, api)

  // Hydrate once from storage (merge only serializable fields)
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const data = JSON.parse(raw)
      set({
        ...initialState,
        ...pickSerializable(data)
      })
    }
  } catch {}

  // Subscribe and persist only serializable parts
  api.subscribe((state) => {
    try {
      const serializable = pickSerializable(state)
      localStorage.setItem(key, JSON.stringify(serializable))
    } catch {}
  })

  return initialState
}

function pickSerializable(state) {
  const { columns, tasks, filter, modal } = state || {}
  return { columns, tasks, filter, modal }
}