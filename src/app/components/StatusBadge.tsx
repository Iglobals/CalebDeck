interface StatusBadgeProps {
  status: "open" | "closed" | "preparing" | "ready" | "delivered" | "pending";
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className = "" }: StatusBadgeProps) {
  const statusConfig = {
    open: { color: "bg-green-500", text: label || "Open now" },
    closed: { color: "bg-red-500", text: label || "Closed" },
    preparing: { color: "bg-yellow-500", text: label || "Preparing" },
    ready: { color: "bg-[#FF6B35]", text: label || "Ready" },
    delivered: { color: "bg-green-500", text: label || "Delivered" },
    pending: { color: "bg-gray-400", text: label || "Pending" },
  };

  const config = statusConfig[status];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.color} animate-pulse`} />
      <span className="text-sm text-[#121212]">{config.text}</span>
    </div>
  );
}
