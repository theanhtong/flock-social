# Flock Social - UI Kit & Architecture Guidelines

> 💡 **Visual UI Kit Showcase**: Access `http://localhost:3000/ui-kit` to interactively view all components.

Minimalist, clean, and functional component library for **Flock Social** (`apps/web`), optimized for backend logic development and API testing.

---

## 🏗️ 1. Architecture & State Management

### State Management (Zustand)
- All authentication state (`user`, `token`, `isLoading`, `isLoginModalOpen`, `isRegisterModalOpen`) is managed via **Zustand** in `@/store/auth-store.ts`.
- Hook: `useAuthStore()`

### Notifications (Sonner Toast)
- Global toast notifications use `sonner` (`<Toaster position="bottom-right" richColors theme="dark" />` in `app/layout.tsx`).

---

## 👤 2. Profile Routes & Role System

### Profile Routes:
- `/profile`: Self Profile Page ([app/profile/page.tsx](file:///home/theanhtong/Projects/flock-social/apps/web/app/profile/page.tsx)) with Edit Profile modal.
- `/profile/[username]`: Public Profile Page ([app/profile/[username]/page.tsx](file:///home/theanhtong/Projects/flock-social/apps/web/app/profile/[username]/page.tsx)).

### Role Badge (`@/components/ui/role-badge`):
Displays user role permissions:
- `admin`: Red solid badge `[ADMIN]`
- `moderator`: Amber solid badge `[MODERATOR]`
- `bot_system`: Cyan solid badge `[BOT]`
- `customer`: Slate subtle badge `[MEMBER]`

```tsx
import { RoleBadge } from '@/components/ui/role-badge';

<RoleBadge role={user.role} size="sm" />
```

---

## 🔐 3. Auth Routes & Modals

### Dedicated Auth Routes:
- `/login`: Standalone Login Page ([app/login/page.tsx](file:///home/theanhtong/Projects/flock-social/apps/web/app/login/page.tsx))
- `/register`: Standalone Register Page ([app/register/page.tsx](file:///home/theanhtong/Projects/flock-social/apps/web/app/register/page.tsx)) with Confirm Password & OTP verification.
- `/`: Main dashboard route that automatically redirects to `/login` if unauthenticated.
