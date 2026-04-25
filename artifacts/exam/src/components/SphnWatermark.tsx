interface SphnWatermarkProps {
  text?: string;
  opacity?: number;
}

export default function SphnWatermark({
  text = "SPHN",
  opacity = 0.09,
}: SphnWatermarkProps) {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
      style={{ opacity }}
    >
      <svg
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="sphn-watermark-pattern"
            patternUnits="userSpaceOnUse"
            width="220"
            height="120"
            patternTransform="rotate(-28)"
          >
            <text
              x="0"
              y="60"
              fontSize="28"
              fontWeight="800"
              fontFamily="Inter, sans-serif"
              fill="#1e3a8a"
              letterSpacing="6"
            >
              {text}
            </text>
          </pattern>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="url(#sphn-watermark-pattern)"
        />
      </svg>
    </div>
  );
}
