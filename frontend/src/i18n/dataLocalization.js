// Shared helper for every src/data/*.js file that has an English dict of
// player-facing content (dialogue beats, narrator lines, quest labels...)
// and needs a Hindi/Tamil overlay on top of it.
//
// This is deliberately an OVERLAY, not a parallel rewrite: `base` (the
// existing English export) stays the single source of truth for shape and
// keys. `translations` only needs to cover the keys someone has actually
// translated so far — anything missing (a whole entry, or one field within
// an entry) silently falls back to the English version instead of
// rendering blank/broken content.
//
// `deep` controls how a translated entry is merged onto its English
// counterpart: true does a shallow-per-field merge (e.g. a dialogue beat
// keeps its English `animation`/`speaker` while only `lines` is
// overridden); false swaps the whole entry only if a translation exists.
export function resolveLocalized(base, translations, id, language, { deep = true } = {}) {
  const original = base[id]
  if (!original) return original
  if (language === 'en') return original

  const translated = translations?.[language]?.[id]
  if (!translated) return original
  if (!deep || typeof original !== 'object' || Array.isArray(original)) return translated

  return { ...original, ...translated }
}

// Builds a `get(language)` accessor that returns the WHOLE dict for that
// language, with every key merged the same way resolveLocalized does for a
// single id -- used where a caller wants to index a dict directly (e.g.
// `QUEST_META[questId]`) rather than go id-by-id.
export function makeLocalizedDict(base, translations, options) {
  return function getLocalizedDict(language) {
    if (language === 'en') return base
    const overlay = translations?.[language]
    if (!overlay) return base
    const merged = {}
    for (const id of Object.keys(base)) {
      merged[id] = resolveLocalized(base, translations, id, language, options)
    }
    return merged
  }
}
