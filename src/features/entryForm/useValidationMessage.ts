import { useTranslation } from 'react-i18next'
import { isValidationKey } from './schema'

/** Turns a Zod message (a translation key) into text for the current language. */
export function useValidationMessage(): (message: string | undefined) => string | undefined {
  const { t } = useTranslation()
  return (message) => {
    if (!message) return undefined
    return isValidationKey(message) ? t(message) : message
  }
}
