import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Wellcome | Experiencias gastronomicas para viver e criar',
  description: 'Encontre pessoas, sabores e historias perto de voce. Entre na lista de espera da Wellcome.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
