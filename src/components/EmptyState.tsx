import type { ReactNode } from 'react'

interface EmptyStateProps {
  emoji: string
  title: string
  body: string
  action?: ReactNode
  children?: ReactNode
}

export function EmptyState({ emoji, title, body, action, children }: EmptyStateProps) {
  return (
    <div className="mx-auto max-w-md rounded-3xl border border-line bg-card p-8 text-center shadow-polaroid">
      <p className="text-5xl" aria-hidden="true">
        {emoji}
      </p>
      <h2 className="mt-4 font-display text-2xl font-semibold">{title}</h2>
      <p className="mt-2 text-ink-soft">{body}</p>
      {children}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  )
}
