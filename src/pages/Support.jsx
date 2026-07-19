import SupportUsButton from "support-us-button";
import "support-us-button/style.css";
import { useTheme } from "../context/ThemeContext";

function Support() {
  const { theme } = useTheme();
  const supportUsButtonProps = {
    Theme: theme,
    projectInformation: {
      name: "OrgExplorer",
      image: "org-explorer-logo.png",
      description:
        "OrgExplorer is an open-source tool that visualizes GitHub organization activity, helping teams analyze repositories, contributors, and project health through interactive insights.",
    },

    organizationInformation: {
      name: "AOSSIE",
      image: "/aossie-logo.svg",
      link: "https://aossie.org",
      desc: "AOSSIE is an Australian not-for-profit organization that supports and brings together open-source projects. We believe open source is a resource-efficient and collaborative way to share knowledge, encourage innovation, and make education more accessible through strong community participation.",
    },

    sponsors: [
      {
        name: "Google",
      },
      {
        name: "Stable Order",
      },
    ],

    ctaSection: {
      sponsorLink: [
        {
          name: "Support Now",
          url: "https://opencollective.com/aossie",
        }
      ],
    },
    Logo: true,
    className: "overflow-hidden",
    border: {
      TopX1: "-10",
      TopX2: "110",
      BottomX1: "-10",
      BottomX2: "110",
      LeftY1: "-10",
      LeftY2: "115",
      RightY1: "-10",
      RightY2: "115",
    },
  };

  return (
    <div>
      <SupportUsButton {...supportUsButtonProps} />
    </div>
  );
}

export default Support;
