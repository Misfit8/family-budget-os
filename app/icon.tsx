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
          background: "#2563eb",
          borderRadius: 96,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            fontSize: 300,
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
