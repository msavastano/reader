import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "StoryDrift — Online Story Reader",
  description: "Import any free online story and read it in a beautiful, paginated reader with customizable themes, fonts, and reading progress tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
