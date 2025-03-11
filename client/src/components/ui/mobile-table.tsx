
import React from "react";
import { cn } from "@/lib/utils";
import { useTouchGestures } from "@/hooks/use-touch-gestures";
import { ChevronRight, MoreVertical } from "lucide-react";
import { Button } from "./button";

interface MobileTableProps<T extends Record<string, any>> {
  data: T[];
  columns: {
    key: keyof T;
    header: string;
    render?: (value: any, item: T) => React.ReactNode;
    priority?: "high" | "medium" | "low";
  }[];
  onRowClick?: (item: T) => void;
  onSwipeLeft?: (item: T) => void;
  onSwipeRight?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
}

export function MobileTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  onSwipeLeft,
  onSwipeRight,
  className,
  emptyMessage = "Nessun dato disponibile",
}: MobileTableProps<T>) {
  const [activeRowIndex, setActiveRowIndex] = React.useState<number | null>(null);

  if (!data.length) {
    return (
      <div className="py-6 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  // Filtriamo le colonne per priorità per dispositivi mobili
  const highPriorityColumns = columns.filter(
    (col) => !col.priority || col.priority === "high"
  );

  return (
    <div className={cn("space-y-1", className)}>
      {data.map((item, index) => {
        const { gestureHandlers } = useTouchGestures({
          onSwipe: (direction) => {
            if (direction === "left" && onSwipeLeft) {
              onSwipeLeft(item);
            } else if (direction === "right" && onSwipeRight) {
              onSwipeRight(item);
            }
          },
        });

        return (
          <div
            key={index}
            className={cn(
              "bg-card p-3 rounded-lg shadow-sm border border-border",
              "touch-target relative overflow-hidden transition-all duration-200",
              activeRowIndex === index && "scale-[0.98] bg-muted",
              onRowClick && "cursor-pointer active:scale-[0.98]"
            )}
            onClick={() => onRowClick && onRowClick(item)}
            onTouchStart={() => setActiveRowIndex(index)}
            onTouchEnd={() => setActiveRowIndex(null)}
            {...gestureHandlers}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 space-y-2">
                {highPriorityColumns.map((column) => (
                  <div key={String(column.key)} className="space-y-0.5">
                    <div className="text-xs text-muted-foreground">
                      {column.header}
                    </div>
                    <div className="font-medium">
                      {column.render
                        ? column.render(item[column.key], item)
                        : String(item[column.key] || "-")}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center space-x-2">
                {onRowClick && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
                <Button variant="ghost" size="icon" className="touch-target">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground mt-2 text-right">
              {onSwipeLeft || onSwipeRight ? "Scorri per altre azioni" : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}
