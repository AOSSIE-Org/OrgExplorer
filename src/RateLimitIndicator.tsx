import { useEffect, useState } from "react";

interface RateLimitData {
  limit: number;
  remaining: number;
  reset: number;
}

export default function RateLimitIndicator() {
  const [rateLimit, setRateLimit] = useState<RateLimitData | null>(null);

  useEffect(() => {
    async function fetchRateLimit() {
      try {
        const response = await fetch("https://api.github.com/rate_limit");
        const data = await response.json();

        setRateLimit({
          limit: data.rate.limit,
          remaining: data.rate.remaining,
          reset: data.rate.reset,
        });
      } catch (error) {
        console.error("Error fetching rate limit:", error);
      }
    }

    fetchRateLimit();
  }, []);

  if (!rateLimit) return <p>Loading API status...</p>;

  const resetTime = new Date(rateLimit.reset * 1000).toLocaleTimeString();

  return (
    <div
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        background: "#1f2937",
        padding: "12px",
        borderRadius: "8px",
        color: "white",
        fontSize: "14px",
      }}
    >
      <strong>GitHub API Status</strong>
      <p>Remaining: {rateLimit.remaining} / {rateLimit.limit}</p>
      <p>Reset: {resetTime}</p>
    </div>
  );
}