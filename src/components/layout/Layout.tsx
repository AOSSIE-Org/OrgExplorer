import type { ReactNode } from "react";
import Navbar from "./Navbar";
import RateLimitBanner from "../RateLimitBanner";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <RateLimitBanner />

      <main className="flex-1">{children}</main>

      <Footer />
    </div>
  );
}