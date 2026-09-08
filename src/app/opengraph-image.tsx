import { ImageResponse } from "next/og";
import { AppIconArt } from "@/lib/app-icon-art";

export const alt = "Japan Trip — itinerary companion";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "#f6f1e8",
          padding: "72px 88px",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 360,
            height: 360,
            marginRight: 72,
            boxShadow: "0 18px 40px rgba(180, 35, 24, 0.22)",
            borderRadius: 80,
            overflow: "hidden",
          }}
        >
          <AppIconArt size={360} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#b42318",
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
            }}
          >
            Nov 2026
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 16,
              color: "#1c1917",
              fontSize: 84,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            Japan Trip
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 20,
              color: "#57534e",
              fontSize: 32,
              fontWeight: 600,
              lineHeight: 1.3,
            }}
          >
            Itinerary companion synced with Notion
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 36,
              color: "#b42318",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            Kyoto · Nara · Osaka
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
