
export default function EmptyStateCard({
  SvgIcon,
  title = "No results found",
  description = "We couldn't find anything for this organization right now.",
  buttonText = "Explore Organizations",
  onButtonClick,
}) {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "620px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "10px",
          padding: "42px 36px",
          textAlign: "center",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset",
        }}
      >
        {/* Top Icon */}
        <div
          style={{
            width: "72px",
            height: "72px",
            margin: "0 auto 28px",
            borderRadius: "16px",
            background: "rgba(255, 214, 0, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {SvgIcon}
        </div>

        {/* Title */}
        <h2
          style={{
            color: "var(--text)",
            fontSize: "3rem",
            fontWeight: 700,
            lineHeight: 1.15,
            marginBottom: "18px",
            letterSpacing: "-1px",
          }}
        >
          {title}
        </h2>

        {/* Description */}
        <p
          style={{
            color: "var(--text2)",
            fontSize: "1rem",
            lineHeight: 1.7,
            maxWidth: "470px",
            margin: "0 auto",
          }}
        >
          {description}
        </p>

        {/* CTA Button */}
        <button
          onClick={onButtonClick}
          style={{
            marginTop: "34px",
            background: "var(--accent)",
            color: "#111111",
            border: "none",
            padding: "16px 28px",
            borderRadius: "2px",
            fontSize: "1rem",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.opacity = "0.92";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0px)";
            e.currentTarget.style.opacity = "1";
          }}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
