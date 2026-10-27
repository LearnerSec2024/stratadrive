type IconName = "arrow" | "chevron" | "menu" | "close" | "check" | "compass" | "road" | "leaf" | "calendar" | "info";

const paths: Record<IconName, string[]> = {
  arrow: ["M4 12h16", "m13 5 7 7-7 7"],
  chevron: ["m9 5 7 7-7 7"],
  menu: ["M4 6h16M4 12h16M4 18h16"],
  close: ["m6 6 12 12M6 18 18 6"],
  check: ["m5 12 4 4L19 6"],
  compass: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18", "m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"],
  road: ["M7 3 3 21M17 3l4 18M12 3v3M12 10v4M12 18v3"],
  leaf: ["M20 4c-9-1-16 2-16 9a7 7 0 0 0 7 7c7 0 10-7 9-16Z", "M5 19 15 9"],
  calendar: ["M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2ZM7 3v4M17 3v4M3 11h18M8 15h2M14 15h2"],
  info: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18", "M12 11v6M12 7h.01"],
};

export function Icon({ name, className = "" }: { name: IconName; className?: string }) {
  return (
    <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {paths[name].map((d, index) => <path key={index} d={d} />)}
    </svg>
  );
}

export function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none" focusable="false">
        <path d="M8 25 13 7M19 7l5 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M16 8v3m0 4v3m0 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}
