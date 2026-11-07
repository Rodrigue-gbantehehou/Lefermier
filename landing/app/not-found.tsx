import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "1rem", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "4rem", fontWeight: "900", color: "#16a34a", margin: 0 }}>404</h1>
      <h2 style={{ fontSize: "1.5rem", fontWeight: "bold", marginTop: "1rem" }}>Page introuvable</h2>
      <p style={{ color: "#666", marginTop: "0.5rem" }}>
        La page que vous recherchez n'existe pas ou a été déplacée.
      </p>
      <Link
        href="/"
        style={{
          marginTop: "1.5rem",
          display: "inline-block",
          padding: "0.75rem 1.5rem",
          backgroundColor: "#16a34a",
          color: "white",
          borderRadius: "0.5rem",
          textDecoration: "none",
          fontWeight: "600",
        }}
      >
        Retour à l'accueil
      </Link>
    </div>
  );
}
