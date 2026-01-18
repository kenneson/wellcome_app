# Entities Slice 🧱

This directory contains **Entities** - the business domain objects of the application.

## Responsibility
Entities represent the "Noun" of the business logic (e.g., User, Event, Review, Booking). They contain high-level rules that are rarely changed.

## Rules
- **Can import from**: `shared`.
- **Cannot import from**: `features`, `app`, `pages`.

## Structure
```
user/
├── ui/           # Components like UserCard, Avatar (dumb components)
├── model/        # Types, interfaces, and simple logic (selectors)
└── lib/          # Helper functions specific to this entity
```
