import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: "#16a34a",
          borderRadius: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", width: 92, height: 98 }}>
          <div
            style={{
              width: 56,
              height: 56,
              background: "white",
              transform: "rotate(45deg)",
              borderRadius: 6,
              position: "absolute",
              top: 0,
              left: "50%",
              marginLeft: -28,
            }}
          />
          <div
            style={{
              width: 70,
              height: 56,
              background: "white",
              borderRadius: "0 0 8px 8px",
              position: "absolute",
              bottom: 0,
              left: "50%",
              marginLeft: -35,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 30,
                fontWeight: 900,
                color: "#16a34a",
                lineHeight: 1,
                fontFamily: "sans-serif",
              }}
            >
              $
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
