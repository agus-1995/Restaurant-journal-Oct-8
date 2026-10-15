import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { useValidationMessage } from '@/features/entryForm/useValidationMessage'
import { errorMessageKey } from '@/lib/errors'
import { useAuth } from './AuthContext'
import { AuthCard } from './AuthCard'
import { loginSchema, type LoginValues } from './schemas'

export function LoginPage() {
  const { t } = useTranslation()
  const { signIn } = useAuth()
  const message = useValidationMessage()
  const [error, setError] = useState<unknown>(null)
  const { register, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  // On success the auth state flips to "signed in" and <RedirectIfSignedIn> sends the user on.
  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      await signIn(values.email, values.password)
    } catch (caught) {
      setError(caught)
    }
  })

  return (
    <AuthCard title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
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
          autoComplete="current-password"
          revealable
          error={message(formState.errors.password?.message)}
          {...register('password')}
        />
        {error !== null && (
          <p role="alert" className="font-semibold text-wine">
            {t(errorMessageKey(error))}
          </p>
        )}
        <Button type="submit" fullWidth disabled={formState.isSubmitting}>
          {formState.isSubmitting ? t('auth.login.submitting') : t('auth.login.submit')}
        </Button>
      </form>
      <p className="mt-5 text-center">
        <Link to="/forgot-password" className="font-semibold text-terracotta underline">
          {t('auth.login.forgot')}
        </Link>
      </p>
      <p className="mt-4 text-center text-ink-soft">
        {t('auth.login.noAccount')}{' '}
        <Link to="/signup" className="font-semibold text-terracotta underline">
          {t('auth.login.toSignup')}
        </Link>
      </p>
    </AuthCard>
  )
}
