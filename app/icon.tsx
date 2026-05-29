import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// Generated app icon (no binary asset committed). Indigo tile with a centered
// "E" — kept well inside the safe zone so it also works as a maskable icon.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#4f46e5",
          color: "#ffffff",
          fontSize: 300,
          fontWeight: 700,
        }}
      >
        E
      </div>
    ),
    { ...size },
  );
}
