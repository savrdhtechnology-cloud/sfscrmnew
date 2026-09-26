const APPLICATIONS_DEPLOY_MARKER = "premium-applications-v2";
void APPLICATIONS_DEPLOY_MARKER;
import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Savrdh Credit Platform",
  description: "Financial CRM and digital credit marketplace by Savrdh Financial Services"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
