import type { RouteObject } from 'react-router-dom'
import { AuthFrame } from '@/features/auth/AuthFrame'
import { RedirectIfSignedIn, RequireAuth } from '@/features/auth/guards'
import { ForgotPasswordPage } from '@/features/auth/ForgotPasswordPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { ResetPasswordPage } from '@/features/auth/ResetPasswordPage'
import { SignupPage } from '@/features/auth/SignupPage'
import { AppShell } from './layout/AppShell'
import { EntryDetailPage } from '@/features/entry/EntryDetailPage'
import { EntryEditPage } from '@/features/entry/EntryEditPage'
import { JournalPage } from '@/features/journal/JournalPage'
import { LogPage } from '@/features/log/LogPage'
import { SearchPage } from '@/features/search/SearchPage'
import { SharePage } from '@/features/share/SharePage'
import { WishlistPage } from '@/features/wishlist/WishlistPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RouteErrorPage } from './pages/RouteErrorPage'

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AuthFrame />,
        children: [
          {
            element: <RedirectIfSignedIn />,
            children: [
              { path: 'login', element: <LoginPage /> },
              { path: 'signup', element: <SignupPage /> },
              { path: 'forgot-password', element: <ForgotPasswordPage /> },
            ],
          },
          { path: 'reset-password', element: <ResetPasswordPage /> },
        ],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            path: '/',
            element: <AppShell />,
            children: [
              { index: true, element: <JournalPage /> },
              { path: 'log', element: <LogPage /> },
              { path: 'entry/:id', element: <EntryDetailPage /> },
              { path: 'entry/:id/edit', element: <EntryEditPage /> },
              { path: 'search', element: <SearchPage /> },
              { path: 'share', element: <SharePage /> },
              { path: 'wishlist', element: <WishlistPage /> },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
]
