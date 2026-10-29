import SupportUsButton from "support-us-button";
import "support-us-button/style.css";
import { useTheme } from "../context/ThemeContext";
import logo from "../assets/og-logo.svg";
function Support() {
  const { theme } = useTheme();
  const supportUsButtonProps = {
    Theme: theme,
    projectInformation: {
      name: "OrgExplorer",
      image: logo,
      description:
        "OrgExplorer is an open-source tool that visualizes GitHub organization activity, helping teams analyze repositories, contributors, and project health through interactive insights.",
    },

    organizationInformation: {
      name: "AOSSIE",
      image: "/aossie-logo.svg",
      link: "https://aossie.org",
      desc: "AOSSIE is a non-profit organization dedicated to building impactful open-source software, mentoring contributors, and fostering innovation through global collaboration.",
    },

    sponsors: [
      {
        name: "Google Summer of Code",
      }
    ],

    ctaSection: {
      sponsorLink: [
        {
          name: "Support Now",
          url: "https://buymeacoffee.com/aossie",
        },
      ],
    },
    Logo: true,
  };

  return (
    <div>
      <SupportUsButton {...supportUsButtonProps} />
    </div>
  );
}

export default Support;
