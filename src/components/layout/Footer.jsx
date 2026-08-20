import { Link } from "react-router-dom";
import {
  FaGithub,
  FaLinkedin,
  FaDiscord,
  FaYoutube,
  FaXTwitter,
} from "react-icons/fa6";
import { HiOutlineMail } from "react-icons/hi";
import Logo from "../../assests/og-logo.svg?react";
import { useTheme } from "../../context/ThemeContext";
import { BsHeartFill } from "react-icons/bs";

const footerLinks = [
  {
    label: "Documentation",
    href: "https://github.com/AOSSIE-Org/OrgExplorer/blob/main/README.md",
  },
  {
    label: "Terms of Service",
    href: "/terms",
  },
  {
    label: "Privacy Policy",
    href: "/privacy",
  },
  {
    label: "API Status",
    href: "/settings#api-status",
  },
  {
    label: "Support Us",
    href: "/support-us"
  }
];

const socialLinks = [
  {
    label: "Email",
    href: "mailto:aossie.oss@gmail.com",
    icon: HiOutlineMail,
  },
  {
    label: "GitHub",
    href: "https://github.com/AOSSIE-Org",
    icon: FaGithub,
  },
  {
    label: "Discord",
    href: "https://discord.com/invite/hjUhu33uAn",
    icon: FaDiscord,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/aossie/",
    icon: FaLinkedin,
  },
  {
    label: "X",
    href: "https://x.com/aossie_org",
    icon: FaXTwitter,
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@AOSSIE-Org",
    icon: FaYoutube,
  },
];

export default function Footer() {
  const { theme } = useTheme();
  return (
    <footer role="contentinfo" style={{ borderTop: "1px solid var(--border)" }}>
      <div className="flex w-full flex-col gap-8 px-4 py-8 md:px-6 lg:flex-row lg:items-center lg:justify-around">

        {/* LEFT SECTION */}
        <div className="flex items-center gap-8 justify-center">
          {/* Logo */}
          <img
            src="/aossie-logo.svg"
            alt="AOSSIE"
            className="h-16 w-auto"/>

          {/* Separator */}
          <div className="h-20 w-px bg-zinc-700" />

          {/* Description */}
          <div className="max-w-sm">
            <p className="mt-2 text-sm leading-5" style={{color: "var(--text2)"}}>
              AOSSIE is a non-profit organization dedicated to building
              impactful open-source software, mentoring contributors,
              and fostering innovation through global collaboration.
            </p>
          </div>
        </div>

        {/* MIDDLE SECTION */}
        <div className="flex flex-col lg:flex-row lg:gap-8 items-center">
          {/* Separator */}
          <div className="h-25 w-px bg-zinc-700 rotate-90 lg:rotate-180" />
        
          <div className="flex flex-col gap-6">
            {/* NAVIGATION */}
            <nav
              aria-label="Footer Navigation"
              className="flex flex-wrap items-center gap-x-6 gap-y-3 justify-center"
            >
              {footerLinks.map((item) => {
                const isExternal = item.href.startsWith("http") || item.href.startsWith("mailto:");
                const linkStyle = {
                  color: "var(--text2)",
                  transition: "color 0.2s ease",
                };

                if (isExternal) {
                  return (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={linkStyle}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "var(--accent)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "var(--text2)";
                      }}
                    >
                      {item.label}
                    </a>
                  );
                }

                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    style={linkStyle}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text2)";
                    }}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* SOCIAL LINKS */}
            <div className="flex items-center gap-6 justify-center">
              {socialLinks.map((item) => {
                const Icon = item.icon;

                return (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit our ${item.label}`}
                    style={{
                      color: "var(--text2)",
                      transition: "color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "var(--text2)";
                    }}
                  >
                    <Icon size={18} />
                  </a>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* RIGHT SECTION */}
        <div className="flex flex-col lg:flex-row lg:gap-8 items-center">
          {/* Separator */}
          <div className="h-25 w-px bg-zinc-700 rotate-90 lg:rotate-180" />
          
          <div className="flex flex-col gap-2 items-end text-right">
            <p
              className=" flex items-center
                text-xs tracking-[0.2em]"
            >
              © {new Date().getFullYear()}
              <span>
                <Logo className="h-15 w-auto"/>
              </span>
            </p>

            <p
              className="
                text-xs uppercase tracking-[0.2em]
                text-zinc-600
              "
            >
              Built for open source communities
            </p>

            <p className="flex items-center justify-center gap-2 text-sm font-normal">
              <span>Made with</span>
              <BsHeartFill className="text-yellow-400" size={14} />
              <span>
                by <a href="https://github.com/AOSSIE-Org" target="_blank" rel="noreferrer" aria-label="AOSSIE GitHub link" className="font-semibold">AOSSIE</a>
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
