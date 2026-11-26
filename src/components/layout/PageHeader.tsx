/** Page intro row: short description on the left, primary actions on the right (title lives in the TopBar, like Optomyze). */
export const PageHeader = ({ description, actions, children }: { description?: string; actions?: React.ReactNode; children?: React.ReactNode }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      {description && <p className="text-[13px] text-muted-foreground">{description}</p>}
      {children}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
