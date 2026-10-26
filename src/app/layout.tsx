import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Buddhist Video Studio",
  description: "Local-first Buddhist educational video generator"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
