import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SIMATIK - PLN UP3 Sanggau",
  description: "Sistem Informasi Monitoring Alat Tulis Kantor PLN UP3 Sanggau",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}