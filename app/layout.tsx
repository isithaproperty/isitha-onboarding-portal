import './globals.css';

export const metadata = {
  title: 'Isitha Global Staff Portal',
  description: 'Isitha Global staff onboarding, contracts, leave and compliance portal',
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
