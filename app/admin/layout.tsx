import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "../(preview)/globals.css";

export const metadata: Metadata = {
  title: "Admin Dashboard - ChatBot Chancelaria",
  description: "Painel administrativo do ChatBot para Oficiais de Chancelaria",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
