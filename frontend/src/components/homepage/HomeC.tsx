import React from "react";

/**
 * Hindi Sales Dashboard – pixel-close clone of your reference.
 * -------------------------------------------------------------
 * - Single file, dependency-free (only TailwindCSS)
 * - Highly commented so it’s easy to edit
 * - Fully responsive; large rounded cards; soft blue accents
 * - Includes a tiny inline-SVG chart to avoid chart libs
 */

/*******************************\
|* Tiny Icon Set (inline SVGs) *|
\*******************************/
const ArrowUp = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" aria-hidden="true" {...props}>
    <path d="M10 3l5 6h-3v8H8V9H5l5-6z" fill="currentColor" />
  </svg>
);

const InfoCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a1.25 1.25 0 110 2.5A1.25 1.25 0 0112 6zm-1.5 5h3v7h-3v-7z"
    />
  </svg>
);

const CameraIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M9 3l1.5 2H14l1.5-2H18a3 3 0 013 3v11a3 3 0 01-3 3H6a3 3 0 01-3-3V6a3 3 0 013-3h3zM12 8a5 5 0 100 10 5 5 0 000-10z"
    />
  </svg>
);

const FacebookIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      fill="currentColor"
      d="M22 12a10 10 0 10-11.6 9.9v-7h-2.3V12h2.3V9.8c0-2.3 1.4-3.6 3.5-3.6 1 0 1.9.08 2.2.11v2.6h-1.5c-1.2 0-1.5.73-1.5 1.5V12h2.7l-.43 2.9h-2.3v7A10 10 0 0022 12z"
    />
  </svg>
);

/*********************\
|* Basic UI Primitives *|
\*********************/
/** Rounded pill with tone */
function Pill({
  children,
  tone = "gray",
  className = "",
}: React.PropsWithChildren<{
  tone?: "blue" | "green" | "red" | "gray";
  className?: string;
}>) {
  const tones: Record<string, string> = {
    blue: "bg-[#E5EEFF] text-[#2B4D9C]",
    green: "bg-[#E9F7EF] text-[#1E7B4F]",
    red: "bg-[#FDEBEE] text-[#C03548]",
    gray: "bg-gray-100 text-gray-700",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border border-black/5 ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Understated button used in card footers */
function FooterButton({ children }: React.PropsWithChildren) {
  return (
    <button
      type="button"
      className="w-full rounded-xl bg-[#EAF1FF] text-[#3856B8] font-semibold py-2.5 text-sm hover:brightness-95"
    >
      {children}
    </button>
  );
}

/** Generic soft Card */
function Card({
  title,
  children,
  footer,
  className = "",
}: React.PropsWithChildren<{
  title?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}>) {
  return (
    <section
      className={`min-w-0 rounded-[22px] border border-black/10 bg-white shadow-sm ${className}`}
    >
      {title && (
        <header className="px-4 sm:px-5 py-3 sm:py-4">
          {typeof title === "string" ? (
            <h2 className="text-[15px] sm:text-base font-semibold text-gray-900">
              {title}
            </h2>
          ) : (
            title
          )}
        </header>
      )}

      <div className="px-4 sm:px-5 pb-4 sm:pb-5">{children}</div>

      {footer && (
        <footer className="px-4 sm:px-5 py-3 border-t border-black/5">
          {footer}
        </footer>
      )}
    </section>
  );
}

/******************************\
|* Tiny dependency-free Chart *|
\******************************/
/**
 * MiniLineChart – renders a smooth-ish line and points with a faint grid.
 * Keep arrays short (<= 12 points) for simplicity.
 */
function MiniLineChart({
  series,
  className = "",
}: {
  series: number[];
  className?: string;
}) {
  const width = 640;
  const height = 220;
  const pad = 24;
  const max = Math.max(1, ...series);
  const min = Math.min(0, ...series);
  const y = (v: number) =>
    height - pad - ((v - min) / (max - min || 1)) * (height - pad * 2);
  const x = (i: number) =>
    pad + (i * (width - pad * 2)) / Math.max(1, series.length - 1);
  const d = series.map((v, i) => `${i ? "L" : "M"}${x(i)},${y(v)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`w-full ${className}`}>
      {/* Y grid */}
      {[0.2, 0.5, 0.8].map((t) => (
        <line
          key={t}
          x1={pad}
          x2={width - pad}
          y1={pad + (height - pad * 2) * t}
          y2={pad + (height - pad * 2) * t}
          className="stroke-gray-200"
          strokeWidth={1}
        />
      ))}

      {/* line */}
      <path
        d={d}
        className="fill-none stroke-[#3B82F6]"
        strokeWidth={3}
        strokeLinejoin="round"
      />

      {/* points */}
      {series.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={4} className="fill-[#3B82F6]" />
      ))}
    </svg>
  );
}

/********************\
|* Demo Mocked Data *|
\********************/
const revenue = {
  value: "₹32,00,000",
  series: [0, 5, 40, 80, 78, 55, 42, 12, 38, 80, 30],
};

const topBook = {
  cover:
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=300&auto=format&fit=crop",
  title: "Khilega To Dekhenge",
  author: "Vinod Kumar Shukla",
  isbn: "978-0143030607",
  language: "Hindi",
  growth: "+25%",
  rupees: "+ ₹1,83,000",
};

const topAuthor = {
  avatar:
    "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?q=80&w=200&auto=format&fit=crop",
  name: "Vinod Kumar Shukla",
  life: "1 Jan 1937 - Present",
  growth: "5%",
  followers: "+ 800 followers",
};

const inventory = [
  {
    id: 1,
    title: "Sophie Ka Sansar",
    author: "Jostein Gaarder",
    cover:
      "https://images.unsplash.com/photo-1528208079124-0ad3f07c22e5?q=80&w=300&auto=format&fit=crop",
    available: 23,
    daysLeft: "0.5 days left",
    alert: {
      tone: "red" as const,
      text: "Refill your stock for smooth operation",
    },
  },
  {
    id: 2,
    title: "Azadi",
    author: "Arundhati Roy",
    cover:
      "https://images.unsplash.com/photo-1528208079124-0ad3f07c22e5?q=80&w=300&auto=format&fit=crop",
    available: 89,
    daysLeft: "5 days left",
    alert: {
      tone: "amber" as const,
      text: "Refill your stock for smooth operation",
    },
  },
];

/**********************\
|* Section Components *|
\**********************/
function RevenueCard() {
  return (
    <Card
      title={
        <div className="flex items-center gap-4">
          <span className="text-[#292929] font-semibold ">
            Revenue Overview
          </span>
          {/* tabs – non-interactive for now */}
          <div className="ml-auto flex items-center gap-1 rounded-full bg-gray-100 p-1 text-xs">
            {[
              { label: "Total", active: true },
              { label: "Online" },
              { label: "Offline" },
            ].map((t) => (
              <button
                key={t.label}
                type="button"
                className={`px-2.5 py-1 rounded-full font-semibold ${
                  t.active ? "bg-white text-[#1e3a8a] shadow" : "text-gray-600"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      }
      className="lg:col-span-7"
    >
      {/* headline row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-3xl sm:text-4xl font-extrabold text-[#43547E]">
          {revenue.value}
        </div>
        <Pill tone="blue" className="py-2">
          This Month
        </Pill>

        {/* legend */}
        <div className="ml-auto flex items-center gap-4 text-xs">
          <span className="inline-flex items-center gap-1 text-gray-700">
            <span className="size-2 rounded-full bg-[#1e3a8a] inline-block" />{" "}
            Online
          </span>
          <span className="inline-flex items-center gap-1 text-gray-400">
            <span className="size-2 rounded-full bg-gray-400 inline-block" />{" "}
            Offline
          </span>
        </div>
      </div>

      {/* deltas */}
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-2 text-green-700">
          <ArrowUp className="w-3 h-3" />{" "}
          <span className="font-semibold">2.05%</span>{" "}
          <span className="text-gray-500">from last month</span>
        </span>
        <span className="inline-flex items-center gap-2 text-gray-700">
          {" "}
          <span className="font-semibold">0.05%</span>{" "}
          <span className="text-gray-500">vs January</span>
        </span>
        <span className="inline-flex items-center gap-2 text-blue-700">
          {" "}
          <span className="font-semibold">5.25%</span>{" "}
          <span className="text-gray-500">vs target</span>
        </span>
      </div>

      {/* chart */}
      <div className="mt-3 rounded-2xl border border-black/5 bg-white overflow-hidden">
        <MiniLineChart series={revenue.series} />
      </div>

      {/* info chip */}
      <div className="mt-3 rounded-2xl bg-gray-100 text-gray-700 px-4 py-3 flex items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-full bg-[#E5EEFF] text-[#2B4D9C] w-6 h-6">
          <InfoCircle className="w-4 h-4" />
        </span>
        <span className="text-sm">
          Amazon contributed 25% of this month’s growth.
        </span>
      </div>
    </Card>
  );
}

function TopBookCard() {
  return (
    <Card
      title={
        <div className="flex items-center">
          <span className="font-semibold">Top Book</span>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#2947A9]">Month</span>
            <span className="text-gray-400">Year</span>
          </div>
        </div>
      }
      className="lg:col-span-5"
      footer={<FooterButton>See More</FooterButton>}
    >
      <div className="flex items-start gap-3">
        <img
          src={topBook.cover}
          alt="book cover"
          className="h-16 w-12 rounded-md object-cover"
        />
        <div className="min-w-0">
          <div className="font-semibold text-gray-900">{topBook.title}</div>
          <div className="text-sm text-gray-600">{topBook.author}</div>
          <p className="mt-1 text-xs text-gray-500">
            <span className="font-semibold">ISBN:</span> {topBook.isbn}{" "}
            <span className="ml-2 font-semibold">Language:</span>{" "}
            {topBook.language}
          </p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-3xl font-extrabold text-[#1e3a8a] inline-flex items-center gap-1">
            {topBook.growth}
            <ArrowUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-[11px] text-gray-500">{topBook.rupees}</div>
        </div>
      </div>
    </Card>
  );
}

function TopAuthorCard() {
  return (
    <Card
      title={
        <div className="flex items-center">
          <span className="font-semibold">Top Author</span>
          <div className="ml-auto flex items-center gap-2 text-xs">
            <span className="font-semibold text-[#2947A9]">Month</span>
            <span className="text-gray-400">Year</span>
          </div>
        </div>
      }
      className="lg:col-span-5"
      footer={<FooterButton>See More</FooterButton>}
    >
      <div className="flex items-start gap-3">
        <img
          src={topAuthor.avatar}
          alt="author"
          className="h-12 w-12 rounded-full object-cover"
        />
        <div className="min-w-0">
          <div className="font-semibold text-gray-900">{topAuthor.name}</div>
          <div className="text-xs text-gray-600">{topAuthor.life}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-3xl font-extrabold text-[#1e3a8a] inline-flex items-center gap-1">
            {topAuthor.growth}
            <ArrowUp className="w-4 h-4 text-green-600" />
          </div>
          <div className="text-[11px] text-gray-500">{topAuthor.followers}</div>
        </div>
      </div>
    </Card>
  );
}

function InventoryCard() {
  return (
    <Card
      title={
        <div className="flex items-center gap-3">
          <span className="font-semibold">Inventory</span>
          <Pill tone="red">Critical</Pill>
        </div>
      }
      className="flex items-stretch flex-col"
      footer={<FooterButton>Know More</FooterButton>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {inventory.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl bg-[#F3F6FD]/60 border border-black/10 p-3"
          >
            <div className="flex items-start gap-3">
              <img
                src={item.cover}
                alt="cover"
                className="h-20 w-16 rounded-md object-cover"
              />
              <div className="min-w-0">
                <div className="font-semibold text-[#163060]">{item.title}</div>
                <div className="text-xs text-gray-600">{item.author}</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] text-[#C03548] font-semibold">
                      Stock Available
                    </div>
                    <div className="text-2xl font-extrabold">
                      {item.available}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {item.daysLeft}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* alert strip */}
            <div
              className={`mt-3 rounded-xl px-3 py-2 text-xs font-medium flex items-start gap-2 ${
                item.alert.tone === "red"
                  ? "bg-[#FDEBEE] text-[#A12B3A]"
                  : "bg-[#FFF4DE] text-[#A35C00]"
              }`}
            >
              <span className="mt-0.5">•</span>
              <span>{item.alert.text}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SocialMediaCard() {
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <span className="font-semibold">Social Media</span>
          <Pill tone="green">All Good</Pill>
        </div>
      }
      className=""
      footer={<FooterButton>Know More</FooterButton>}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Panel 1 */}
        <div className="rounded-2xl border border-black/10 p-4">
          <div className="flex flex-col items-center gap-1 text-sm font-medium text-gray-700">
            <CameraIcon className="w-5 h-5" /> Instagram
          </div>

          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+835</div>
              <div className="text-[11px] text-gray-600">
                Followers from previous month
              </div>
            </div>
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+20%</div>
              <div className="text-[11px] text-gray-600">
                Views from previous month
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2 */}
        <div className="rounded-2xl border border-black/10 p-4">
          <div className="flex flex-col items-center gap-1 text-sm font-medium text-gray-700">
            <FacebookIcon className="w-5 h-5" /> Instagram
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+835</div>
              <div className="text-[11px] text-gray-600">
                Followers from previous month
              </div>
            </div>
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+20%</div>
              <div className="text-[11px] text-gray-600">
                Views from previous month
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3 */}
        <div className="rounded-2xl border border-black/10 p-4">
          <div className="flex flex-col items-center gap-1 text-sm font-medium text-gray-700">
            <CameraIcon className="w-5 h-5" /> Instagram
          </div>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+835</div>
              <div className="text-[11px] text-gray-600">
                Followers from previous month
              </div>
            </div>
            <div className="rounded-2xl bg-[#EAF1FF] px-4 py-3">
              <div className="text-3xl font-extrabold">+20%</div>
              <div className="text-[11px] text-gray-600">
                Views from previous month
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/*******************\
|* Page Entry Point *|
\*******************/
export default function HindiBooksSalesDashboard() {
  return (
    // <div className="">
    //   {/* 12-col grid on large screens; stack on mobile */}
    //   <div className="">
    //     <div className="flex ">
    //       <div className="w-1/2">
    //         <RevenueCard />
    //       </div>
    //       <div className="w-1/2 ">
    //         <div className="">
    //           <TopBookCard />
    //         </div>
    //         <div className="">
    //           <TopAuthorCard />
    //         </div>
    //       </div>
    //     </div>
    //     <div className="flex items-stretch">
    //       <div className="w-1/2">
    //         <InventoryCard />
    //       </div>
    //       <div className="w-1/2 h-full">
    //         <SocialMediaCard />
    //       </div>
    //     </div>
    //   </div>
    // </div>
    //   );
    // }

    <main className="mx-auto max-w-[1200px] py-6 text-slate-800 dark:text-slate-100">
      {/* Header numbers (kept simple; edit freely) */}
      {/* <div className="mb-4 flex flex-wrap items-end gap-3">
        <h1 className="text-2xl font-bold text-[#43547E]">₹32,00,000</h1>
        <div> This Month </div>
      </div> */}

      {/*
        Layout grid
        - Use CSS Grid for consistent equal-height cards.
        - auto-rows-[minmax(0,1fr)] makes each implicit row stretch equally.
      */}
      <div className="grid auto-rows-[minmax(0,1fr)] gap-4 lg:grid-cols-2">
        <div className="grid">
          <RevenueCard />
        </div>
        <div className="grid gap-4">
          <TopBookCard />
          <TopAuthorCard />
        </div>

        <InventoryCard />
        <SocialMediaCard />
      </div>

      {/*
        TIP: If columns ever misalign in height
        - Ensure the parent grid has auto-rows-[minmax(0,1fr)] or content-stretch
        - Add h-full to each Card to make them stretch.
      */}
    </main>
  );
}
