import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cookies } from "next/headers";
import Providers from "@/components/Providers";
import Script from "next/script";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // 자동 확대 방지를 위해 1로 고정
  userScalable: false, // 사용자 임의 확대 제한
};

export const metadata: Metadata = {
  title: "읽고픈 책들",
  description: "도서 검색 및 보관함",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "읽고픈 책들",
    statusBarStyle: "default",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialLibraryName = cookieStore.get("library_owner_name")?.value || null;

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers initialLibraryName={initialLibraryName}>
          {children}
        </Providers>
        <Script id="register-sw" strategy="afterInteractive">{`if ("serviceWorker" in navigator) { window.addEventListener("load", function() { navigator.serviceWorker.register("/sw.js"); }); }`}</Script>
      </body>
    </html>
  );
}
