import { useState, useEffect, useRef, TouchEvent, MouseEvent } from "react";
import { Bell, X, MoveLeft, MoveRight, Clock, Eye, Sparkles } from "lucide-react";
import type { AdminOrder } from "@/lib/orders.functions";

interface UnprocessedOrdersBannerProps {
  unprocessedOrders: AdminOrder[];
  onViewOrders: () => void;
  autoDismissSeconds?: number; // Default 15 seconds
}

export function UnprocessedOrdersBanner({
  unprocessedOrders,
  onViewOrders,
  autoDismissSeconds = 15,
}: UnprocessedOrdersBannerProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [dismissedLatestId, setDismissedLatestId] = useState<string | null>(null);
  
  // Drag & Swipe state
  const [startX, setStartX] = useState<number | null>(null);
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Timer state
  const [remainingMs, setRemainingMs] = useState(autoDismissSeconds * 1000);
  const [isTimerPaused, setIsTimerPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const latestOrder = unprocessedOrders[0];
  const latestOrderId = latestOrder?.id || latestOrder?.orderCode || "";

  // Reset dismissal if a NEW order arrives that wasn't previously dismissed
  useEffect(() => {
    if (latestOrderId && latestOrderId !== dismissedLatestId) {
      setIsDismissed(false);
      setIsFadingOut(false);
      setRemainingMs(autoDismissSeconds * 1000);
    }
  }, [latestOrderId, dismissedLatestId, autoDismissSeconds]);

  // Timer ticker (runs when not hovered, not dragging, and not paused)
  useEffect(() => {
    if (isDismissed || isHovered || isDragging || isTimerPaused || remainingMs <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 100) {
          handleDismiss("timeout");
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isDismissed, isHovered, isDragging, isTimerPaused, remainingMs]);

  const handleDismiss = (reason?: string) => {
    setIsFadingOut(true);
    setTimeout(() => {
      setIsDismissed(true);
      setDismissedLatestId(latestOrderId);
      setIsFadingOut(false);
      setOffsetX(0);
    }, 250);
  };

  const handleActionClick = () => {
    onViewOrders();
    handleDismiss("action_clicked");
  };

  // Touch Handlers
  const handleTouchStart = (e: TouchEvent) => {
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (startX === null) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    setOffsetX(diff);
  };

  const handleTouchEnd = () => {
    if (Math.abs(offsetX) > 90) {
      handleDismiss("swipe");
    } else {
      setOffsetX(0);
    }
    setStartX(null);
    setIsDragging(false);
  };

  // Mouse Drag Handlers (for desktop drag-to-swipe)
  const handleMouseDown = (e: MouseEvent) => {
    // Avoid initiating drag on button clicks
    if ((e.target as HTMLElement).closest("button")) return;
    setStartX(e.clientX);
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (startX === null || !isDragging) return;
    const diff = e.clientX - startX;
    setOffsetX(diff);
  };

  const handleMouseUpOrLeave = () => {
    if (!isDragging) return;
    if (Math.abs(offsetX) > 90) {
      handleDismiss("swipe");
    } else {
      setOffsetX(0);
    }
    setStartX(null);
    setIsDragging(false);
  };

  if (unprocessedOrders.length === 0 || isDismissed) {
    return null;
  }

  const progressPercent = Math.max(0, Math.min(100, (remainingMs / (autoDismissSeconds * 1000)) * 100));
  const opacity = isFadingOut ? 0 : Math.max(0.2, 1 - Math.abs(offsetX) / 300);

  return (
    <div className="relative mb-6 overflow-hidden select-none">
      {/* Background container wrapper */}
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          handleMouseUpOrLeave();
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        style={{
          transform: `translateX(${offsetX}px)`,
          opacity: opacity,
          transition: isDragging ? "none" : "transform 0.25s ease-out, opacity 0.25s ease-out",
        }}
        className={`relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl bg-amber-500/15 p-4 text-[#0F3D24] ring-2 ring-amber-500/40 shadow-lg cursor-grab active:cursor-grabbing ${
          offsetX === 0 && !isFadingOut ? "animate-pulse" : ""
        }`}
      >
        {/* Banner Left Info */}
        <div className="flex items-start sm:items-center gap-3 pr-8 sm:pr-0">
          <div className="rounded-xl bg-amber-500 p-2.5 text-white shadow-md flex-shrink-0 mt-0.5 sm:mt-0">
            <Bell size={20} className="animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                <span>⚠️ ATTENTION:</span>
                <span className="bg-amber-500/20 text-amber-900 px-2 py-0.5 rounded-full text-xs font-black">
                  {unprocessedOrders.length} New Unprocessed Order(s)
                </span>
              </h4>
            </div>
            <p className="text-xs text-[#0F3D24]/90 mt-0.5">
              Latest order from <span className="font-bold underline">{latestOrder.customerName}</span> ({latestOrder.orderCode}) -{" "}
              <span className="font-bold text-emerald-900">₦{latestOrder.total.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-2 text-[10px] text-[#0F3D24]/60 mt-1">
              <span className="flex items-center gap-1">
                <MoveLeft size={10} /> Swipe left/right to dismiss <MoveRight size={10} />
              </span>
              {isHovered && <span className="text-amber-800 font-semibold">(Timer paused)</span>}
            </div>
          </div>
        </div>

        {/* Banner Right Actions */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={handleActionClick}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0F3D24] px-4 py-2 text-xs font-bold text-white hover:bg-[#134a2c] active:scale-95 transition shadow-sm"
          >
            <Eye size={13} />
            <span>View New Orders Now</span>
          </button>

          {/* Dismiss (X) Button */}
          <button
            onClick={() => handleDismiss("button")}
            title="Dismiss notification"
            aria-label="Dismiss alert"
            className="rounded-full bg-amber-500/20 p-2 text-amber-900 hover:bg-amber-500/40 active:scale-90 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Auto-Dismiss Timer Progress Bar at bottom */}
        {autoDismissSeconds > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500/20">
            <div
              className={`h-full transition-all duration-100 ease-linear ${
                isHovered ? "bg-amber-600/50" : "bg-amber-600"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
