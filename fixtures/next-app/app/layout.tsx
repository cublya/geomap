import type { ReactNode } from "react";
import "@cublya/geo/styles.css";

export const metadata = { title: "@cublya/geo Next.js fixture" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
