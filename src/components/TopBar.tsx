import { useState } from "react";
import { NewCustomerDialog } from "@/components/NewCustomerDialog";
import { NewQuoteDialog } from "@/components/NewQuoteDialog";

export function TopBar() {
  const [customerOpen, setCustomerOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);

  return (
    <>
      <header className="h-14 border-b border-border bg-surface/60 backdrop-blur-sm flex items-center justify-end gap-2 px-8 flex-shrink-0">
        <button
          type="button"
          onClick={() => setQuoteOpen(true)}
          className="text-xs font-medium text-foreground px-3 py-1.5 bg-card ring-1 ring-black/5 rounded shadow-sm hover:bg-surface-strong transition-colors"
        >
          Tạo báo giá
        </button>
        <button
          type="button"
          onClick={() => setCustomerOpen(true)}
          className="text-xs font-medium text-primary-foreground px-3 py-1.5 bg-terracotta rounded shadow-sm hover:opacity-90 transition-opacity"
        >
          + Khách hàng mới
        </button>
      </header>

      <NewCustomerDialog open={customerOpen} onOpenChange={setCustomerOpen} />
      <NewQuoteDialog open={quoteOpen} onOpenChange={setQuoteOpen} />
    </>
  );
}
