type AppIconArtProps = {
  size: number;
};

export function AppIconArt({ size }: AppIconArtProps) {
  const radius = Math.round(size * 0.22);
  const gateWidth = Math.round(size * 0.62);
  const gateHeight = Math.round(size * 0.34);
  const pillarWidth = Math.max(4, Math.round(size * 0.09));
  const beamHeight = Math.max(3, Math.round(size * 0.07));
  const capHeight = Math.max(4, Math.round(size * 0.11));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#b42318",
        borderRadius: radius,
      }}
    >
      <div
        style={{
          position: "relative",
          width: gateWidth,
          height: gateHeight,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: gateWidth,
            height: capHeight,
            background: "#f6f1e8",
            borderRadius: Math.max(2, Math.round(size * 0.03)),
          }}
        />
        <div
          style={{
            position: "absolute",
            top: capHeight - Math.max(2, Math.round(size * 0.02)),
            left: "50%",
            transform: "translateX(-50%)",
            width: gateWidth * 0.88,
            height: beamHeight,
            background: "#f6f1e8",
            borderRadius: Math.max(2, Math.round(size * 0.02)),
          }}
        />
        <div
          style={{
            width: pillarWidth,
            height: gateHeight - capHeight,
            background: "#f6f1e8",
            borderRadius: Math.max(2, Math.round(size * 0.02)),
            marginRight: gateWidth * 0.34,
          }}
        />
        <div
          style={{
            width: pillarWidth,
            height: gateHeight - capHeight,
            background: "#f6f1e8",
            borderRadius: Math.max(2, Math.round(size * 0.02)),
          }}
        />
      </div>
    </div>
  );
}
