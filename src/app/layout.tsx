import type { Metadata } from 'next';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './globals.css';
import './poster.css';

export const metadata: Metadata = {
  title: 'SEA ACADEMY',
  description: 'SEA ACADEMY - Vocabulary Poster Studio',
  icons: {
    icon: '/poster-assets/brand-logo.svg',
    apple: '/poster-assets/brand-logo.svg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
