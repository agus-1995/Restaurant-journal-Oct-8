import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/Modal'
import { errorMessageKey } from '@/lib/errors'
import { useAuth } from './AuthContext'

/** "Account" button (who am I signed in as, and sign out). Hidden when there are no accounts. */
export function AccountMenu({
  className = '',
  compact = false,
}: {
  className?: string
  /** Icon only (still labelled for screen readers): for the tight mobile header. */
  compact?: boolean
}) {
  const { t } = useTranslation()
  const { required, user, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>(null)

  if (!required || !user) return null

  async function handleSignOut() {
    setBusy(true)
    setError(null)
    try {
      await signOut() // the route guard then sends the user to the login screen
    } catch (caught) {
      setError(caught)
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-3 font-semibold text-ink-soft hover:text-ink ${className}`}
      >
        <Icon name="user" className="size-6" />
        <span className={compact ? 'sr-only' : undefined}>{t('auth.account.button')}</span>
      </button>
      {open && (
        <Modal title={t('auth.account.title')} onClose={() => setOpen(false)}>
          <p className="text-ink-soft">{t('auth.account.signedInAs')}</p>
          <p className="mb-6 font-display text-xl font-semibold break-all">{user.email}</p>
          {error !== null && (
            <p role="alert" className="mb-3 font-semibold text-wine">
              {t(errorMessageKey(error))}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row-reverse">
            <Button variant="danger" disabled={busy} onClick={() => void handleSignOut()}>
              {busy ? t('auth.account.signingOut') : t('auth.account.signOut')}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t('actions.close')}
            </Button>
          </div>
        </Modal>
      )}
    </>
  )
}
