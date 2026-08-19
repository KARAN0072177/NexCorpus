import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexCorpus | Smart Document Assistant & Knowledge Base",
  description:
    "Upload PDFs, resumes, and technical documents to NexCorpus. Ask questions, explore topics, and get instant answers with verified source references powered by AI.",
  keywords: [
    "NexCorpus",
    "Document Intelligence",
    "Smart Search",
    "PDF Assistant",
    "Document Q&A",
    "Knowledge Base",
  ],
  authors: [{ name: "NexCorpus Team" }],
  openGraph: {
    title: "NexCorpus | Smart Document Assistant & Knowledge Base",
    description:
      "Upload documents and ask questions with verified source answers.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
