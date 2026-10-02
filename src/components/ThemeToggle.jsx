import { FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ onToggle }) {
  const { theme, toggleTheme } = useTheme();

  const handleClick = (e) => {
    toggleTheme(e);
    onToggle?.(e);
  };

  return (
    <button
      onClick={handleClick}
      style={{
        background: "none",
        border: "1px solid var(--border)",
        color: "var(--text2)",
        borderRadius: 6,
        padding: "5px 10px",
        fontSize: 12,
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
      className='h-[-webkit-fill-available]'
      title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? <FiSun size={13} /> : <FiMoon size={13} />}
    </button>
  );
}
