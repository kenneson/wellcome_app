# Features Slice 🧩

This directory contains **Features** - functional units that provide business value to the user.

## responsibility
A Feature is a "User Scenario". It handles **interaction** between the user and the application logic.

## Rules
- **Can import from**: `shared`, `entities`.
- **Cannot import from**: `app`, other `features` (unless absolutely necessary, but prefer composition in `pages` or `app`).

## Structure of a Feature
Each feature folder (e.g., `create-event`) should ideally follow:
```
create-event/
├── ui/           # UI Components specific to this feature
├── model/        # Business logic (hooks, state, stores)
├── api/          # (Optional) Feature-specific API calls
└── index.ts      # Public API of the feature
```
