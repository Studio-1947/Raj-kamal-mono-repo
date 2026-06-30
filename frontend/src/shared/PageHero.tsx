import React from "react";

type PageHeroProps = {
  /** Small label above the title, e.g. "Online Sales Data" */
  kicker: string;
  /** Big page title, e.g. "Website" */
  title: string;
  /** Optional status pill shown beside the kicker */
  badge?: { label: string; tone?: "live" | "neutral" };
  /** Optional controls / actions rendered on the right side of the banner */
  right?: React.ReactNode;
  /** Optional controls rendered on the left, directly beneath the title */
  belowTitle?: React.ReactNode;
  /** Optional decorative PNG/illustration shown on the far right of the banner */
  illustrationSrc?: string;
};

/**
 * Reusable page banner — navy card with a status pill, kicker, large title,
 * an optional right-hand controls slot and an optional decorative image.
 */
export default function PageHero({ kicker, title, badge, right, belowTitle, illustrationSrc }: PageHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-[36px] border border-[#02376B] bg-[#02376B] px-7 py-12 sm:px-9 sm:py-14">
      {/* Decorative image (e.g. device mockups) bleeding to the right edge */}
      {illustrationSrc && (
        <img
          src={illustrationSrc}
          alt=""
          aria-hidden
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
          className="pointer-events-none absolute bottom-0 right-0 z-0 hidden h-full w-auto max-w-[55%] object-contain object-right-bottom select-none md:block"
        />
      )}

      <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            {badge && (
              <span
                className={
                  "inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs font-semibold " +
                  (badge.tone === "neutral"
                    ? "border-gray-300 text-gray-600"
                    : "border-green-300 text-green-600")
                }
              >
                {badge.tone !== "neutral" && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                )}
                {badge.label}
              </span>
            )}
            <p className="text-lg font-medium text-white/75 sm:text-xl">{kicker}</p>
          </div>
          <h1 className="mt-1 truncate text-4xl font-normal tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          {belowTitle && <div className="mt-4">{belowTitle}</div>}
        </div>

        {right && <div className="flex shrink-0 flex-wrap items-center gap-4">{right}</div>}
      </div>
    </div>
  );
}
