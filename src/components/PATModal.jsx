import React, { useState, useEffect } from "react";
import {FiEye, FiEyeOff, FiSave, FiTrash2, FiX} from "react-icons/fi";
import { useApp } from "../context/AppContext";

export default function PATModal({ open, onClose }) {
  const { pat, savePat } = useApp();

  const [draft, setDraft] = useState(pat);
  const [show, setShow] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft(pat);
      setSaved(false);
    }
  }, [open, pat]);

  if (!open) return null;

  const handleSave = () => {
    savePat(draft.trim());
    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 1500);
  };

  const handleDelete = () => {
    savePat("");
    setDraft("");
  };

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.55)",
          zIndex: 999,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          width: 720,
          maxWidth: "95vw",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          zIndex: 1000,
          boxShadow: "0 20px 60px rgba(0,0,0,.45)",
          overflow: "hidden",
        }}
      >
        {/* Header */}

        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
              }}
            >
              GitHub Personal Access Token
            </div>

            <div
              style={{
                fontSize: 13,
                color: "var(--text2)",
                marginTop: 4,
              }}
            >
              Stored locally in your browser. Never sent anywhere except GitHub.
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text2)",
              cursor: "pointer",
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Body */}

        <div
          style={{
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--text2)",
              marginBottom: 6,
              letterSpacing: ".06em",
            }}
          >
            PERSONAL ACCESS TOKEN
          </div>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
            }}
          >
            <input
              type={show ? "text" : "password"}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxx"
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "var(--surface2)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            />

            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              style={{
                padding: "0 14px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              {show ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              marginBottom: 30,
            }}
          >
            <button
              type="button"
              onClick={handleSave}
              disabled={!draft.trim()}
              style={{
                padding: "10px 18px",
                border: "none",
                borderRadius: 8,
                background: "var(--accent)",
                color: "#111",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FiSave />
              {saved ? "Saved" : "Save"}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={!draft.trim()}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "transparent",
                color: "var(--text)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <FiTrash2 />
              Delete
            </button>
          </div>

          <div
            style={{
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            How to create a PAT
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {[
              [
                "01",
                "Go to GitHub Settings → Developer settings → Personal access tokens",
              ],
              [
                "02",
                'Click "Generate new token" and choose Fine-grained token',
              ],
              [
                "03",
                "Give it a name and choose an expiration.",
              ],
              [
                "04",
                'Grant "Public repositories" read-only permission.',
              ],
              [
                "05",
                "Generate the token and copy it.",
              ],
              [
                "06",
                "Paste it above and click Save.",
              ],
            ].map(([n, text]) => (
              <div
                key={n}
                style={{
                  background: "var(--surface2)",
                  padding: 14,
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    color: "var(--accent)",
                    fontWeight: 700,
                    marginBottom: 6,
                  }}
                >
                  {n}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text2)",
                    lineHeight: 1.6,
                  }}
                >
                  {text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}

        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--red)",
              color: "var(--text)",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
}