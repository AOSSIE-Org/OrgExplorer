import { Link } from "react-router-dom";
import {
  FaGithub,
  FaLinkedin,
  FaDiscord,
  FaYoutube,
  FaXTwitter,
} from "react-icons/fa6";
import { HiOutlineMail } from "react-icons/hi";
import ogLogoWhite from "../../assests/og-logo.png";
import ogLogoDark from "../../assests/og-logo-dark.png";
import { useTheme } from "../../context/ThemeContext";

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
      <div className="flex w-full flex-col gap-8 px-4 py-8 md:px-6 lg:flex-row lg:items-center lg:justify-between">
        {/* LEFT SECTION */}
        <div className="flex flex-col gap-6">
          {/* NAVIGATION */}
          <nav
            aria-label="Footer Navigation"
            className="flex flex-wrap items-center gap-x-6 gap-y-3"
          >
            {footerLinks.map((item) => (
              <Link
                key={item.label}
                to={item.href}
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
                {item.label}
              </Link>
            ))}
          </nav>

          {/* SOCIAL LINKS */}
          <div className="flex items-center gap-6">
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

        {/* RIGHT SECTION */}
        <div className="flex flex-col items-start gap-2 text-left lg:items-end lg:text-right">
          <p
            className=" flex items-center
              text-xs tracking-[0.2em]
              text-zinc-500
            "
          >
            © {new Date().getFullYear()}
            <span>
              {
                theme === "dark" &&
                  <img src={ogLogoDark} alt="Logo" className='h-20' />
              }
              {
                theme === "light" &&
                  <img src={ogLogoWhite} alt="Logo" className='h-20' />
              }
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
        </div>
      </div>
    </footer>
  );
}
