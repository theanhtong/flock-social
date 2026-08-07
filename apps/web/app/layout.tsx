import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthInitializer } from "@/components/auth-initializer";
import { LoginModal } from "@/components/auth/login-modal";
import { RegisterModal } from "@/components/auth/register-modal";
import { Header } from "@/components/layout/header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flock Social - Modern Social Networking Platform",
  description: "Connecting communities, sharing perspectives, and building ideas together.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0f172a] text-slate-100 font-sans">
        <AuthInitializer />
        <Header />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <LoginModal />
        <RegisterModal />
        <Toaster position="bottom-right" richColors theme="dark" />
      </body>
    </html>
  );
}
