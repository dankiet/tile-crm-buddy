import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-8 gap-6">
      <div className="max-w-[64ch]">
        <h1 className="text-2xl font-medium tracking-tight text-foreground text-balance">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
