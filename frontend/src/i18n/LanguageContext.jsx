import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { getLanguage, setLanguage as persistLanguage } from '../utils/gameStorage.js'
import { UI_STRINGS } from './uiStrings.js'

const LanguageContext = createContext(null)

function lookup(dict, key) {
  // Supports dot-path keys ("drawer.close") without needing a deep-nested
  // literal at every call site.
  return key.split('.').reduce((node, part) => (node == null ? node : node[part]), dict)
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str
  return str.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? vars[name] : match))
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => getLanguage())

  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  // Picks up changes made from anywhere else (onboarding form, the
  // in-game profile drawer, another tab) without needing prop drilling.
  useEffect(() => {
    const handleChange = () => setLanguageState(getLanguage())
    window.addEventListener('languageChanged', handleChange)
    return () => window.removeEventListener('languageChanged', handleChange)
  }, [])

  const setLanguage = useCallback((lang) => {
    setLanguageState(persistLanguage(lang))
  }, [])

  const t = useCallback((key, vars) => {
    const fromCurrent = lookup(UI_STRINGS[language], key)
    if (fromCurrent !== undefined) return interpolate(fromCurrent, vars)
    const fromEnglish = lookup(UI_STRINGS.en, key)
    if (fromEnglish !== undefined) return interpolate(fromEnglish, vars)
    return key
  }, [language])

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
