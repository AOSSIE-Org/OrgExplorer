import { Link } from "react-router-dom";
import {
  FaGithub,
  FaLinkedin,
  FaDiscord,
  FaYoutube,
  FaXTwitter,
} from "react-icons/fa6";
import { HiOutlineMail } from "react-icons/hi";

const footerLinks = [
  {
    label: "Documentation",
    href: "/docs",
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
    href: "/status",
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
  return (
    <footer role="contentinfo" className=" bg-(--bg) text-(--text)">
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
                className="
                  text-xs font-medium uppercase tracking-[0.2em]
                  text-zinc-500
                  transition-colors duration-200
                  hover:text-[#FCD34D]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-[#FCD34D]
                  focus-visible:ring-offset-2
                  focus-visible:ring-offset-black
                  rounded-sm
                "
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* SOCIAL LINKS */}
          <div className="flex items-center gap-3">
            {socialLinks.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Visit our ${item.label}`}
                  className="
                    flex h-10 w-10 items-center justify-center
                    border-2 border-(--border)
                    bg-(--bg)
                    text-(--text)
                    shadow-[3px_3px_0px_0px_#27272a]
                    transition-all duration-150
                    hover:-translate-x-1
                    hover:-translate-y-1
                    hover:border-[#FCD34D]
                    hover:text-[#FCD34D]
                    hover:shadow-[6px_6px_0px_0px_#FCD34D]
                    active:translate-x-0
                    active:translate-y-0
                    active:shadow-[2px_2px_0px_0px_#FCD34D]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-[#FCD34D]
                    focus-visible:ring-offset-2
                    focus-visible:ring-offset-black
                  "
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
            className="
              text-xs uppercase tracking-[0.2em]
              text-zinc-500
            "
          >
            © 2026 OrgExplorer
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