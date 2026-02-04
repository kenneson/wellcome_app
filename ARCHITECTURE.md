# Project Architecture

This project follows the standard **Expo Layered Architecture** for scalability, maintainability, and ease of testing.

## Directory Structure

```
src/
├── app/                 # Expo Router (Filesystem-based routing)
│   ├── (tabs)/          # Tab navigation group
│   ├── (auth)/          # Authentication group
│   └── _layout.tsx      # Root layout and providers
│
├── components/          # Reusable UI components
│   ├── ui/              # Primitive components (Button, Text, Input) - The Design System
│   └── features/        # Complex, feature-specific components (e.g., UserProfileCard)
│
├── hooks/               # Global custom hooks (e.g., useTheme, useAuth)
│
├── services/            # External services and API integrations
│   ├── api/             # Backend API clients (Axios/Fetch)
│   └── auth/            # Auth services (Supabase/Firebase/Native)
│
├── stores/              # Global state management (Zustand/Context)
│
├── types/               # TypeScript type definitions and interfaces
│
├── utils/               # Helper functions and utilities
│
└── constants/           # Global constants (Colors, config)
```

## Layers

1.  **App Layer (`/app`)**:
    *   Contains only Screens and Layouts.
    *   Responsible for Routing and composing Components.
    *   Should allow minimal logic (delegate to Hooks/Stores).

2.  **UI Layer (`/components`)**:
    *   **`/ui`**: Dumb components. Receive props, render UI. No business logic.
    *   **`/features`**: Smart components. Can connect to stores or hooks.

3.  **Logic Layer (`/hooks`, `/stores`)**:
    *   Encapsulates state and business logic.
    *   Hooks for local/reusable logic.
    *   Stores for global app state.

4.  **Data Layer (`/services`)**:
    *   Handles communication with the Backend and Native APIs.
    *   **Offline-First**: Use TanStack Query in `/app/_layout.tsx` to handle caching and offline states.

## Best Practices

*   **Absolute Imports**: Use `@/components/...` instead of `../../components`.
*   **Separation of Concerns**: UI components shouldn't know about API calls directly.
*   **Feature Parity**: Ensure Android and iOS are tested.
