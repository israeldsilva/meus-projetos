import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neuroatlas — Atlas 3D de neuroanatomia",
  description:
    "Atlas tridimensional interativo do sistema nervoso, com fichas de estudo " +
    "de cada estrutura: função, irrigação, relações anatômicas e correlação clínica.",
};

export const viewport: Viewport = {
  themeColor: "#07090d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
