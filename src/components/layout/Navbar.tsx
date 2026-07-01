import { FiMenu, FiSettings, FiZap } from "react-icons/fi";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Link } from "react-router-dom";
import OrgExplorerLogo from "@/assets/logos/org-explorer-logo.svg";
import { useApp } from '../../context/AppContext'
import ThemeToggle from '.././ThemeToggle'

const navItems = [
  { label: "Overview", href: "/overview" },
  { label: "Repositories", href: "/repositories" },
  { label: "Contributors", href: "/contributors" },
  { label: "Network", href: "/network" },
  { label: "Analytics", href: "/analytics" },
  { label: "Governance", href: "/governance" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { rateLimit } = useApp();
  const lowLimit = rateLimit && rateLimit.remaining < 15
  
  return (
    <header
      role="banner"
      className="sticky top-0 z-50 w-full border-b-2 border-(--border) bg-(--bg) text-(--text) backdrop-blur"
    >
      <div className="flex h-20 items-center justify-between px-6 md:px-8">
        {/* LEFT */}
        <div className="flex items-center gap-10">
          {/* LOGO */}
          <Link
            to="/"
            aria-label="Go to OrgExplorer homepage"
            className="group inline-flex items-center"
          >
            <img
              src={OrgExplorerLogo}
              alt="OrgExplorer"
              loading="lazy"
              decoding="async"
              draggable={false}
              className="h-[10em]"
            />
          </Link>
        </div>

        {/* MIDDLE */}
        <div>
          {/* DESKTOP NAV */}
          <nav aria-label="Primary Navigation" className="hidden lg:block">
            <ul className="flex items-center gap-2">
              {navItems.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className={cn(
                      "rounded-md px-4 py-2 text-sm font-medium uppercase tracking-wide text-zinc-400 transition-colors duration-150",
                      "hover:bg-zinc-900 hover:text-[#FCD34D]",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
        {rateLimit && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: lowLimit ? 'var(--red)' : 'var(--text2)' }}>
            <FiZap size={12} />
            {rateLimit.remaining.toLocaleString()} / {rateLimit.limit.toLocaleString()}
          </div>
        )}
        <ThemeToggle />
          {/* SETTINGS */}
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Link to={"/settings"}>
              <FiSettings />
            </Link>
          </Button>

          {/* MOBILE MENU */}
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
          >
            <FiMenu />
          </Button>
        </div>
      </div>

      {/* MOBILE NAVIGATION */}
      {mobileMenuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile Navigation"
          className={cn(
            "overflow-hidden text-center border-t-2 border-(--border) bg-(--bg) text-(--text) lg:hidden",
            "transition-all duration-300 ease-in-out",
            mobileMenuOpen
              ? "max-h-96 opacity-100 translate-y-0"
              : "max-h-0 opacity-0 -translate-y-2 pointer-events-none"
          )}
        >
          <ul className="flex flex-col p-4">
            {navItems.map((item, index) => (
              <li
                key={item.label}
                className={cn(
                  "transition-all duration-300",
                  mobileMenuOpen
                    ? "translate-x-0 opacity-100"
                    : "-translate-x-4 opacity-0"
                )}
                style={{
                  transitionDelay: `${index * 50}ms`,
                }}
              >
                <Link
                  to={item.href}
                  className={cn(
                    "block rounded-md px-4 py-3 text-sm font-medium uppercase tracking-wide text-zinc-300 transition-colors",
                    "hover:bg-zinc-900 hover:text-[#FCD34D]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FCD34D] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}