import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CoachMe — AI Interview Practice",
  description: "Practice behavioural interviews with an AI coach that speaks, listens, and scores your answers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-[#0D0F1A] text-[#F0F2FF] antialiased">
        {children}
      </body>
    </html>
  );
}
