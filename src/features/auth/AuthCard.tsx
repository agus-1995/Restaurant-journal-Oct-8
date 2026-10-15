import type { ReactNode } from 'react'

interface AuthCardProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <section
      aria-labelledby="auth-title"
      className="rounded-3xl border border-line bg-card p-6 shadow-polaroid"
    >
      <h1 id="auth-title" className="text-3xl font-semibold">
        {title}
      </h1>
      {subtitle && <p className="mt-2 text-ink-soft">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </section>
  )
}
