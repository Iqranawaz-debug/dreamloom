"use client";

// Last resort when the root layout itself fails, so styles are inline.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#0a0c1f", color: "#ece8fb", fontFamily: "Georgia, serif", textAlign: "center", padding: 24 }}>
        <main role="alert">
          <h1>Dream Painter needs a moment</h1>
          <p style={{ color: "#b8b4d8" }}>Your dreams are safe on this device.</p>
          <button onClick={reset} style={{ minHeight: 48, padding: "0 24px", borderRadius: 999, border: 0, background: "#c9bcff", color: "#17123a", fontSize: 16, cursor: "pointer" }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
