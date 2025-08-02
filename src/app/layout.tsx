import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home 3D - Interior Design Tool',
  description: 'Create beautiful interior spaces with our 3D design tool',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
