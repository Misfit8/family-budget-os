import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512,
          height: 512,
          background: "#16a34a",
          borderRadius: 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
        }}
      >
        {/* House shape */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Roof */}
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "90px solid transparent",
              borderRight: "90px solid transparent",
              borderBottom: "80px solid white",
            }}
          />
          {/* House body */}
          <div
            style={{
              width: 160,
              height: 120,
              background: "white",
              borderRadius: "0 0 8px 8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Dollar sign */}
            <span
              style={{
                fontSize: 72,
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
