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
          background: "#2563eb",
          borderRadius: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 110,
            fontWeight: 900,
            color: "white",
            lineHeight: 1,
            fontFamily: "sans-serif",
          }}
        >
          $
        </span>
      </div>
    ),
    { ...size }
  );
}
