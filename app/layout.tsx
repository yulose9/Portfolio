import { title } from "process";
import "./globals.css";

export const metadata = {
  title: "John Nazarene",
  description: "Generated manually in existing folder",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
