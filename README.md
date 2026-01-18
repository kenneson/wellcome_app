# Wellcome App 🍽️

> **Connecting people through culinary experiences.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React Native](https://img.shields.io/badge/React_Native-0.76-blue)
![Expo](https://img.shields.io/badge/Expo-50-white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)

**Wellcome** is an innovative platform that connects food lovers with hosts who offer authentic home-dining experiences. Whether you want to share a special recipe, meet new people, or enjoy a unique meal, Wellcome is your place.

## 🏗 Architecture: Feature-Sliced Design (FSD)
This project follows the **Feature-Sliced Design** methodology to ensure scalability, maintainability, and team collaboration.

### Structure (`src/`)
- **`app/`**: Global configuration, navigation, providers, and entry points.
- **`entities/`**: Business domain entities (e.g., `User`, `Event`, `Review`). Reusable across features.
- **`features/`**: User interactions that bring value (e.g., `create-event`, `join-event`, `auth`).
- **`shared/`**: Reusable infrastructure code (UI kit, API clients, Utils). Isolated and decoupled.
- **`pages/`**: (Optional) Composition of features and entities into full screens.

## 🛠 Tech Stack

### Frontend (Mobile)
- **Framework**: React Native + Expo
- **Language**: TypeScript
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query)
- **Styling**: NativeWind (Tailwind CSS) + clsx
- **Forms**: React Hook Form + Zod
- **Navigation**: Expo Router (File-based routing)

### Backend (`backend/`)
- **Runtime**: Node.js 20
- **Framework**: Fastify
- **ORM**: Prisma
- **Database**: PostgreSQL (Primary) + Redis (Cache/Queues)
- **Validation**: Zod (Shared schemas possible)

## 🚀 Getting Started

### Prerequisites
- Node.js (LTS)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/kenneson/wellcome.git
   cd wellcome
   ```

2. **Install Frontend Dependencies**
   ```bash
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   cd ..
   ```

### Running the Project

#### Mobile App
```bash
npx expo start
```
- Press `a` for Android, `i` for iOS, or scan the QR code with Expo Go.

#### Backend Server
```bash
cd backend
npm run dev
```
- Server runs on `http://localhost:3000`

## 🤝 Contribution
Please read our [Contribution Guidelines](CONTRIBUTING.md) before submitting a Pull Request.

---
*Developed with ❤️ by Kenneson Lino*
