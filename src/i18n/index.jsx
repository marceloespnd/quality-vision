import { createContext, useContext } from 'react'
import { translate } from './messages'
export const LanguageContext = createContext('pt-BR')
export function useTranslation() {
  const locale = useContext(LanguageContext)
  return { locale, t: (value) => translate(value, locale) }
}
