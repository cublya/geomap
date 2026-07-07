import type { ReactNode } from "react";
import "@cublya/geomap/styles.css";

export const metadata = { title: "@cublya/geomap Next.js fixture" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
