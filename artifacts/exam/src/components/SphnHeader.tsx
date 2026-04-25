import sphnLogo from "@assets/Screenshot_2026-04-25_at_11.51.22_AM_1777098099787.png";

interface SphnHeaderProps {
  rightSlot?: React.ReactNode;
  subtitle?: string;
}

export default function SphnHeader({ rightSlot, subtitle }: SphnHeaderProps) {
  return (
    <header className="bg-[#1e3a8a] text-white border-b-4 border-[#0ea5e9]">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-md bg-white flex items-center justify-center shrink-0 shadow overflow-hidden p-0.5">
            <img
              src={sphnLogo}
              alt="Sphoorthy Engineering College"
              className="w-full h-full object-contain"
            />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-base sm:text-lg leading-tight truncate">
              Sphoorthy Engineering College
            </div>
            <div className="text-[11px] sm:text-xs text-white/80 truncate">
              {subtitle ?? "Online Examination Portal"}
            </div>
          </div>
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </header>
  );
}
