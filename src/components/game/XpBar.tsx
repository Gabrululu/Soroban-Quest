interface XpBarProps {
  percent: number;
  className?: string;
}
export function XpBar({ percent, className = "" }: XpBarProps) {
  return (
    <div className={`h-2 w-full overflow-hidden bg-primary/25 ${className}`}>
      <div
        className="h-full bg-primary transition-[width] duration-700 ease-out"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
