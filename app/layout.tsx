import './globals.css';

export const metadata = {
  title: 'Isitha Global Onboarding',
  description: 'Staff onboarding and compliance portal',
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
