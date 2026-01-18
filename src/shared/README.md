# Shared Slice 🛠️

This directory contains reusable code that is not specific to any business domain.

## content
- **`ui/`**: The Design System (Buttons, Inputs, Cards). These components should be domain-agnostic.
- **`api/`**: Base API clients (Axios/Fetch wrappers), Interceptors, Global services.
- **`lib/`**: Utilities, helpers, date formatters, hooks (useMounted, useWindowSize).
- **`config/`**: Global constants, environment variables.

## Rules
- **Can import from**: Only external libraries.
- **Cannot import from**: `app`, `pages`, `features`, `entities`.
