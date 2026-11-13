import { useRef, useState } from "react";
export function SignatureBox({
  onChange,
  disabled = false,
}: {
  onChange: (png: string) => void;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const points = useRef(0);
  const [drawn, setDrawn] = useState(false);
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Draw your signature below using your finger or mouse</p>
      <canvas
        aria-label="Draw signature"
        ref={ref}
        width={600}
        height={180}
        className="w-full max-w-xl touch-none rounded-xl border-2 border-slate-300 bg-white"
        onPointerDown={(e) => {
          if (disabled) return;
          const c = ref.current!;
          c.setPointerCapture(e.pointerId);
          const r = c.getBoundingClientRect();
          const ctx = c.getContext("2d")!;
          ctx.beginPath();
          ctx.lineWidth = 2;
          ctx.strokeStyle = "#102f22";
          ctx.lineCap = "round";
          ctx.moveTo(
            ((e.clientX - r.left) * 600) / r.width,
            ((e.clientY - r.top) * 180) / r.height,
          );
          drawing.current = true;
          points.current = 0;
        }}
        onPointerMove={(e) => {
          if (!drawing.current || disabled) return;
          const c = ref.current!,
            r = c.getBoundingClientRect(),
            ctx = c.getContext("2d")!;
          ctx.lineTo(
            ((e.clientX - r.left) * 600) / r.width,
            ((e.clientY - r.top) * 180) / r.height,
          );
          ctx.stroke();
          points.current++;
        }}
        onPointerUp={() => {
          if (drawing.current && points.current > 0) {
            onChange(ref.current!.toDataURL("image/png"));
            setDrawn(true);
          }
          drawing.current = false;
        }}
        onPointerCancel={() => {
          drawing.current = false;
        }}
      />
      <button
        type="button"
        disabled={disabled}
        className="min-h-11 rounded-lg border px-4 text-sm"
        onClick={() => {
          ref.current?.getContext("2d")?.clearRect(0, 0, 600, 180);
          setDrawn(false);
          onChange("");
        }}
      >
        Clear signature
      </button>
      <span className="ml-3 text-xs text-slate-500">
        {drawn ? "Signature captured" : "Signature required"}
      </span>
    </div>
  );
}
