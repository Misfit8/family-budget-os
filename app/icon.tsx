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
        }}
      >
        {/* House: rotated square as roof + rectangle body */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", width: 260, height: 280 }}>
          {/* Roof — rotated square clipped to look like a triangle */}
          <div
            style={{
              width: 160,
              height: 160,
              background: "white",
              transform: "rotate(45deg)",
              borderRadius: 12,
              position: "absolute",
              top: 0,
              left: "50%",
              marginLeft: -80,
            }}
          />
          {/* Body */}
          <div
            style={{
              width: 200,
              height: 160,
              background: "white",
              borderRadius: "0 0 16px 16px",
              position: "absolute",
              bottom: 0,
              left: "50%",
              marginLeft: -100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span
              style={{
                fontSize: 80,
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
