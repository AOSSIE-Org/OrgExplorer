import React from "react";
import { FiX } from "react-icons/fi";

export default function LearnMoreModal({ open, onClose }) {
  if (!open) return null;

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

      <div
        style={{
          position: "fixed",
          left: "50%",
          top: "50%",
          transform: "translate(-50%,-50%)",
          width: 720,
          maxWidth: "95vw",
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          zIndex: 1000,
          boxShadow: "0 20px 60px rgba(0,0,0,.45)",
        }}
      >
        <div
          style={{
            padding: "18px 24px",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            background: "var(--surface)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700 }}>
            Standard vs. Complete Analysis
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

        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--accent)",
                marginBottom: 8,
              }}
            >
              Standard Analysis
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text2)",
                lineHeight: 1.65,
                marginBottom: 16,
              }}
            >
              To keep analysis fast and avoid GitHub API limits, standard mode
              analyzes a representative subset of the organization.
            </div>

            <div
              style={{
                fontSize: 12,
                color: "var(--text2)",
                letterSpacing: ".06em",
                marginBottom: 10,
              }}
            >
              CURRENT LIMITS
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {[
                ["Repositories fetched", "Up to 500 repositories"],
                [
                  "Repositories used for contributor and issue analysis",
                  "Top 10 repositories ranked by a weighted score (stars + 2× forks + 1.5× watchers, with a bonus for repos pushed to within the last year)",
                ],
                [
                  "Contributors",
                  "Up to 100 contributors per repository (≈1,000 per organization)",
                ],
                [
                  "Issues & Pull Requests",
                  "Up to 100 issues/PRs per repository (≈1,000 per organization)",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: "var(--surface2)",
                    padding: 14,
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text2)" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                fontSize: 13,
                color: "var(--text2)",
                lineHeight: 1.65,
                marginTop: 14,
              }}
            >
              Repository rankings, contributor intelligence, governance
              metrics, network visualization, and activity trends are all
              calculated using this standard dataset.
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: 1,
              background: "var(--border)",
              margin: "24px 0",
            }}
          />

          {/* Complete Mode */}
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: "var(--accent)",
                marginBottom: 8,
              }}
            >
              Complete Analysis
            </div>
            <div
              style={{
                fontSize: 13,
                color: "var(--text2)",
                lineHeight: 1.65,
                marginBottom: 16,
              }}
            >
              Complete Analysis uses a GitHub Personal Access Token (PAT) to
              retrieve the full organization dataset.
            </div>

            <div
              style={{
                fontSize: 12,
                color: "var(--text2)",
                letterSpacing: ".06em",
                marginBottom: 10,
              }}
            >
              CURRENT LIMITS
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {[
                ["Repositories fetched", "All public repositories"],
                ["Contributors", "Up to 1,000 contributors per repository"],
                [
                  "Issues & Pull Requests",
                  "Up to 1,000 issues/PRs per repository",
                ],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: "var(--surface2)",
                    padding: 14,
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text)",
                      marginBottom: 4,
                    }}
                  >
                    {label}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text2)" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                fontSize: 13,
                color: "var(--text2)",
                lineHeight: 1.65,
                marginTop: 14,
              }}
            >
              All repository rankings, contributor metrics, governance
              insights, network visualization, and activity trends are
              calculated using the complete dataset.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border)",
            display: "flex",
            justifyContent: "flex-end",
            position: "sticky",
            bottom: 0,
            background: "var(--surface)",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
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