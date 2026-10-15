import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { buttonStyles } from '@/components/buttonStyles'
import { useValidationMessage } from '@/features/entryForm/useValidationMessage'
import { errorMessageKey } from '@/lib/errors'
import { useAuth } from './AuthContext'
import { AuthCard } from './AuthCard'
import { forgotPasswordSchema, type ForgotPasswordValues } from './schemas'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { requestPasswordReset } = useAuth()
  const message = useValidationMessage()
  const [error, setError] = useState<unknown>(null)
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      await requestPasswordReset(values.email)
      setSent(true)
    } catch (caught) {
      setError(caught)
    }
  })

  if (sent) {
    return (
      <AuthCard title={t('auth.forgot.sentTitle')}>
        <p role="status" className="text-lg">
          <span aria-hidden="true">✉️ </span>
          {t('auth.forgot.sentBody')}
        </p>
        <Link to="/login" className={`${buttonStyles('primary', true)} mt-6`}>
          {t('auth.forgot.back')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')}>
      <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-5">
        <TextField
          label={t('auth.email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoCapitalize="none"
          error={message(formState.errors.email?.message)}
          {...register('email')}
        />
        {error !== null && (
          <p role="alert" className="font-semibold text-wine">
            {t(errorMessageKey(error))}
          </p>
        )}
        <Button type="submit" fullWidth disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('auth.forgot.submitting') : t('auth.forgot.submit')}
        </Button>
      </form>
      <p className="mt-5 text-center">
        <Link to="/login" className="font-semibold text-terracotta underline">
          {t('auth.forgot.back')}
        </Link>
      </p>
    </AuthCard>
  )
}
