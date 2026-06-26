type Tab = { id: string; label: string };

type StickyTabsProps = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
};

/**
 * "Sticky-note" tab strip — rounded-top tabs that sit on top of the page
 * content. Active tab is brand blue; inactive tabs are a muted dusty rose.
 */
export default function StickyTabs({ tabs, active, onChange, className }: StickyTabsProps) {
  return (
    <div
      className={
        "flex flex-nowrap gap-2 overflow-x-auto whitespace-nowrap no-scrollbar " + (className || "")
      }
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={
              "shrink-0 rounded-2xl border px-5 pb-3 pt-5 text-sm font-semibold transition-all " +
              (isActive
                ? "border-[#0067B5] bg-[#0067B5] text-white shadow-[0_-2px_10px_rgba(0,0,0,0.08)]"
                : "border-slate-300 bg-slate-200 text-slate-500 hover:bg-slate-300")
            }
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
