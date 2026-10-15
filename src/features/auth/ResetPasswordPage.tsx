import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link, Navigate } from 'react-router-dom'
import { Button } from '@/components/Button'
import { LoadingState } from '@/components/LoadingState'
import { TextField } from '@/components/TextField'
import { buttonStyles } from '@/components/buttonStyles'
import { useValidationMessage } from '@/features/entryForm/useValidationMessage'
import { errorMessageKey } from '@/lib/errors'
import { useAuth } from './AuthContext'
import { AuthCard } from './AuthCard'
import { PASSWORD_MIN_LENGTH, resetPasswordSchema, type ResetPasswordValues } from './schemas'

/** Where the "reset your password" email link lands: the link itself signs the user in briefly. */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { status, updatePassword } = useAuth()
  const message = useValidationMessage()
  const [error, setError] = useState<unknown>(null)
  const [done, setDone] = useState(false)
  const { register, handleSubmit, formState } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirm: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      await updatePassword(values.password)
      setDone(true)
    } catch (caught) {
      setError(caught)
    }
  })

  if (done) return <Navigate to="/" replace />
  if (status === 'loading') return <LoadingState variant="detail" />

  if (status === 'signed_out') {
    return (
      <AuthCard title={t('auth.reset.invalidTitle')}>
        <p role="alert">{t('auth.reset.invalidBody')}</p>
        <Link to="/forgot-password" className={`${buttonStyles('primary', true)} mt-6`}>
          {t('auth.reset.requestNew')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth.reset.title')}>
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-5">
        <TextField
          label={t('auth.newPassword')}
          type="password"
          autoComplete="new-password"
          revealable
          hint={t('auth.passwordHint', { min: PASSWORD_MIN_LENGTH })}
          error={message(formState.errors.password?.message)}
          {...register('password')}
        />
        <TextField
          label={t('auth.confirmPassword')}
          type="password"
          autoComplete="new-password"
          revealable
          error={message(formState.errors.confirm?.message)}
          {...register('confirm')}
        />
        {error !== null && (
          <p role="alert" className="font-semibold text-wine">
            {t(errorMessageKey(error))}
          </p>
        )}
        <Button type="submit" fullWidth disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('auth.reset.submitting') : t('auth.reset.submit')}
        </Button>
      </form>
    </AuthCard>
  )
}
