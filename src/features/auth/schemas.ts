import { z } from 'zod'

const key = (message: string) => ({ error: message })

const email = z
  .string()
  .trim()
  .min(1, key('validation.emailRequired'))
  .pipe(z.email(key('validation.emailInvalid')))

export const PASSWORD_MIN_LENGTH = 8

const newPassword = z.string().min(PASSWORD_MIN_LENGTH, key('validation.passwordTooShort'))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, key('validation.passwordRequired')),
})

export const forgotPasswordSchema = z.object({ email })

export const signupSchema = z
  .object({ email, password: newPassword, confirm: z.string() })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    error: 'validation.passwordsDontMatch',
  })

export const resetPasswordSchema = z
  .object({ password: newPassword, confirm: z.string() })
  .refine((values) => values.password === values.confirm, {
    path: ['confirm'],
    error: 'validation.passwordsDontMatch',
  })

export type LoginValues = z.infer<typeof loginSchema>
export type SignupValues = z.infer<typeof signupSchema>
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>
