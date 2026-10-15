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
import { PASSWORD_MIN_LENGTH, signupSchema, type SignupValues } from './schemas'

export function SignupPage() {
  const { t } = useTranslation()
  const { signUp } = useAuth()
  const message = useValidationMessage()
  const [error, setError] = useState<unknown>(null)
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null)
  const { register, handleSubmit, formState } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirm: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      const outcome = await signUp(values.email, values.password)
      // "signed_in": <RedirectIfSignedIn> takes over. Otherwise the project wants the email confirmed.
      if (outcome === 'confirm_email') setConfirmEmail(values.email)
    } catch (caught) {
      setError(caught)
    }
  })

  if (confirmEmail !== null) {
    return (
      <AuthCard title={t('auth.confirm.title')}>
        <p role="status" className="text-lg">
          <span aria-hidden="true">✉️ </span>
          {t('auth.confirm.body', { email: confirmEmail })}
        </p>
        <Link to="/login" className={`${buttonStyles('primary', true)} mt-6`}>
          {t('auth.confirm.toLogin')}
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard title={t('auth.signup.title')} subtitle={t('auth.signup.subtitle')}>
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
        <TextField
          label={t('auth.password')}
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
          {formState.isSubmitting ? t('auth.signup.submitting') : t('auth.signup.submit')}
        </Button>
      </form>
      <p className="mt-5 text-center text-ink-soft">
        {t('auth.signup.haveAccount')}{' '}
        <Link to="/login" className="font-semibold text-terracotta underline">
          {t('auth.signup.toLogin')}
        </Link>
      </p>
    </AuthCard>
  )
}
