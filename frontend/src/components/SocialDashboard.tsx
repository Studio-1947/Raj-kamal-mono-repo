import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useSearchParams } from "react-router-dom";
import { useLang } from "../modules/lang/LangContext";
import InstagramView from "./InstagramView";
import FacebookView from "./FacebookView";
import YouTubeView from "./YouTubeView";
import MetaAdsView from "./MetaAdsView";
import GenericSocialView from "./GenericSocialView";
import SocialDatePicker from "./SocialDatePicker";
import {
    fetchBrands,
    type Brand,
    type NetworkFlags,
    type PlatformKey,
} from "../services/metricoolApi";
import {
    FaFacebook,
    FaInstagram,
    FaYoutube,
    FaLinkedin,
    FaTiktok,
    FaTwitter,
    FaPinterest,
    FaBullhorn,
} from "react-icons/fa";

type TimeRangeKey = "7d" | "30d" | "90d" | "custom";

const IMPLEMENTED_NETWORKS: PlatformKey[] = [
    "facebook",
    "instagram",
    "youtube",
    "linkedin",
    "tiktok",
    "twitter",
    "pinterest",
    "meta_ads",
];

const SELECTED_BRAND_STORAGE_KEY = "metricool_selected_blog_id";

const NETWORK_ICONS: Partial<Record<keyof NetworkFlags, { Icon: ComponentType<{ className?: string }>; color: string }>> = {
    facebook: { Icon: FaFacebook, color: "text-[#1877F2]" },
    instagram: { Icon: FaInstagram, color: "text-[#E1306C]" },
    youtube: { Icon: FaYoutube, color: "text-[#FF0000]" },
    linkedin: { Icon: FaLinkedin, color: "text-[#0A66C2]" },
    tiktok: { Icon: FaTiktok, color: "text-gray-900" },
    twitter: { Icon: FaTwitter, color: "text-[#1DA1F2]" },
    pinterest: { Icon: FaPinterest, color: "text-[#E60023]" },
    meta_ads: { Icon: FaBullhorn, color: "text-[#0668E1]" },
};

const BRAND_DETAILS: Record<PlatformKey, {
    name: string;
    icon: ComponentType<{ className?: string }>;
    activeBg: string;
    activeBorder: string;
    activeText: string;
    brandColor: string;
    description: string;
}> = {
    facebook: {
        name: "Facebook",
        icon: FaFacebook,
        activeBg: "bg-[#1877F2]/10",
        activeBorder: "border-[#1877F2]",
        activeText: "text-[#1877F2]",
        brandColor: "#1877F2",
        description: "Pages & Reels insights",
    },
    instagram: {
        name: "Instagram",
        icon: FaInstagram,
        activeBg: "bg-[#E1306C]/10",
        activeBorder: "border-[#E1306C]",
        activeText: "text-[#E1306C]",
        brandColor: "#E1306C",
        description: "Account & Reels statistics",
    },
    youtube: {
        name: "YouTube",
        icon: FaYoutube,
        activeBg: "bg-[#FF0000]/10",
        activeBorder: "border-[#FF0000]",
        activeText: "text-[#FF0000]",
        brandColor: "#FF0000",
        description: "Channel growth & videos",
    },
    linkedin: {
        name: "LinkedIn",
        icon: FaLinkedin,
        activeBg: "bg-[#0A66C2]/10",
        activeBorder: "border-[#0A66C2]",
        activeText: "text-[#0A66C2]",
        brandColor: "#0A66C2",
        description: "Company page & posts",
    },
    tiktok: {
        name: "TikTok",
        icon: FaTiktok,
        activeBg: "bg-gray-900/10",
        activeBorder: "border-gray-900",
        activeText: "text-gray-900",
        brandColor: "#000000",
        description: "Video views & audience",
    },
    twitter: {
        name: "Twitter / X",
        icon: FaTwitter,
        activeBg: "bg-[#1DA1F2]/10",
        activeBorder: "border-[#1DA1F2]",
        activeText: "text-[#1DA1F2]",
        brandColor: "#1DA1F2",
        description: "Tweets & follower growth",
    },
    pinterest: {
        name: "Pinterest",
        icon: FaPinterest,
        activeBg: "bg-[#E60023]/10",
        activeBorder: "border-[#E60023]",
        activeText: "text-[#E60023]",
        brandColor: "#E60023",
        description: "Pin clicks & saves",
    },
    meta_ads: {
        name: "Meta Ads",
        icon: FaBullhorn,
        activeBg: "bg-[#0668E1]/10",
        activeBorder: "border-[#0668E1]",
        activeText: "text-[#0668E1]",
        brandColor: "#0668E1",
        description: "Ad campaigns & reach",
    },
};

function BrandNetworkIcons({ brand }: { brand: NetworkFlags }) {
    const entries = Object.entries(NETWORK_ICONS) as [keyof NetworkFlags, typeof NETWORK_ICONS[keyof NetworkFlags]][];
    return (
        <div className="flex items-center gap-1">
            {entries
                .filter(([key]) => brand[key])
                .map(([key, entry]) => {
                    if (!entry) return null;
                    const { Icon, color } = entry;
                    return <Icon key={key} className={`h-3.5 w-3.5 ${color}`} />;
                })}
        </div>
    );
}

function BrandAvatar({ brand }: { brand: Brand }) {
    if (brand.picture) {
        return (
            <img
                src={brand.picture}
                alt={brand.label ?? "Brand"}
                className="h-8 w-8 rounded-full object-cover border border-gray-200"
            />
        );
    }
    return (
        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-normal text-gray-500 border border-gray-200">
            {brand.label?.charAt(0) ?? "?"}
        </div>
    );
}

export default function SocialDashboard() {
    const { t } = useLang();

    const [range, setRange] = useState<TimeRangeKey>("30d");
    const [customFrom, setCustomFrom] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().slice(0, 10);
    });
    const [customTo, setCustomTo] = useState(() => {
        return new Date().toISOString().slice(0, 10);
    });
    const [searchParams, setSearchParams] = useSearchParams();
    const platformParam = searchParams.get("platform") as PlatformKey | null;

    const activeNetwork = useMemo(() => {
        if (platformParam && IMPLEMENTED_NETWORKS.includes(platformParam)) {
            return platformParam;
        }
        return "facebook";
    }, [platformParam]);

    const setActiveNetwork = (network: PlatformKey) => {
        setSearchParams((prev) => {
            const next = new URLSearchParams(prev);
            next.set("platform", network);
            return next;
        }, { replace: true });
    };

    const [brands, setBrands] = useState<Brand[]>([]);
    const [selectedBlogId, setSelectedBlogId] = useState<string | null>(
        () => localStorage.getItem(SELECTED_BRAND_STORAGE_KEY),
    );
    const [switcherOpen, setSwitcherOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetchBrands()
            .then((data) => {
                if (cancelled) return;
                setBrands(data);
                setSelectedBlogId((current) => {
                    if (current && data.some((b) => b.blogId === current)) {
                        return current;
                    }
                    return data[0]?.blogId ?? null;
                });
            })
            .catch((err) => {
                console.warn("Failed to load Metricool brands", err);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (selectedBlogId) {
            localStorage.setItem(SELECTED_BRAND_STORAGE_KEY, selectedBlogId);
        }
    }, [selectedBlogId]);

    const selectedBrand = useMemo(
        () => brands.find((b) => b.blogId === selectedBlogId) ?? null,
        [brands, selectedBlogId],
    );

    const headerTabs: PlatformKey[] = selectedBrand
        ? IMPLEMENTED_NETWORKS.filter((key) => selectedBrand[key])
        : IMPLEMENTED_NETWORKS;

    useEffect(() => {
        if (headerTabs.length > 0) {
            if (!platformParam || !headerTabs.includes(activeNetwork)) {
                setActiveNetwork(headerTabs[0]);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [headerTabs, activeNetwork, platformParam]);

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column: Brand Switcher and Social Channel Selector */}
            <div className="w-full lg:w-64 shrink-0 flex flex-col gap-4">
                {/* Brand Switcher Card */}
                <div className="rounded-3xl border border-gray-200/60 bg-white shadow-sm p-4 flex flex-col gap-4 relative">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                            {selectedBrand && <BrandAvatar brand={selectedBrand} />}
                            <div className="min-w-0">
                                <h2 className="text-xs font-semibold text-gray-900 truncate">
                                    {selectedBrand?.label ?? "Select brand"}
                                </h2>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5">
                                    Active Profile
                                </p>
                            </div>
                        </div>

                        {brands.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setSwitcherOpen((open) => !open)}
                                className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100 transition-colors shadow-sm shrink-0"
                            >
                                <span className="text-[10px]">▼</span>
                            </button>
                        )}
                    </div>

                    {switcherOpen && brands.length > 0 && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setSwitcherOpen(false)}
                            />
                            <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-2xl border border-gray-200 bg-white shadow-lg py-2 max-h-64 overflow-y-auto">
                                {brands.map((brand) => (
                                    <button
                                        key={brand.blogId}
                                        type="button"
                                        onClick={() => {
                                            setSelectedBlogId(brand.blogId);
                                            setSwitcherOpen(false);
                                        }}
                                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 ${brand.blogId === selectedBlogId ? "bg-gray-100" : ""
                                            }`}
                                    >
                                        <BrandAvatar brand={brand} />
                                        <span className="flex-1 text-sm text-gray-900 truncate">
                                            {brand.label}
                                        </span>
                                        <BrandNetworkIcons brand={brand} />
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Vertical Social Channels Navigation */}
                <div className="rounded-3xl border border-gray-200/60 bg-white shadow-sm p-4 flex flex-col gap-3">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-1">
                        Social Channels
                    </p>

                    <div className="flex flex-col gap-2">
                        {headerTabs.map((key) => {
                            const details = BRAND_DETAILS[key];
                            if (!details) return null;
                            const Icon = details.icon;
                            const isActive = activeNetwork === key;

                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setActiveNetwork(key)}
                                    className={`flex items-center gap-3 w-full text-left p-3 rounded-2xl border transition-all duration-200 active:scale-[0.98] ${
                                        isActive
                                            ? `${details.activeBg} ${details.activeText} shadow-sm border-l-4 ${details.activeBorder} font-semibold`
                                            : "border-gray-100 bg-white text-gray-700 hover:bg-gray-50/80 hover:text-gray-900"
                                    }`}
                                >
                                    <Icon
                                        className={`h-5 w-5 shrink-0 ${
                                            isActive ? "" : "text-gray-400"
                                        }`}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-semibold">{details.name}</p>
                                        <p className={`text-[9px] mt-0.5 truncate ${isActive ? "opacity-90" : "text-gray-400"}`}>
                                            {details.description}
                                        </p>
                                    </div>
                                    {isActive && (
                                        <span className="h-1.5 w-1.5 rounded-full shrink-0 animate-pulse" style={{ backgroundColor: details.brandColor }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Column: Metrics Content Area */}
            <div className="flex-1 min-w-0 flex flex-col gap-6">
                {/* Header card with title */}
                <div className="rounded-3xl border border-gray-200/60 bg-white shadow-sm p-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            {BRAND_DETAILS[activeNetwork]?.name ?? activeNetwork} Insights
                        </h1>
                        <p className="text-xs text-gray-500 mt-1">
                            Metricool analysis for your connected {BRAND_DETAILS[activeNetwork]?.name ?? activeNetwork} page.
                        </p>
                    </div>
                </div>

                {/* View Details */}
                {headerTabs.length === 0 && (
                    <div className="rounded-3xl border border-black/5 bg-white shadow-sm p-6 text-sm text-gray-600">
                        No connected social accounts were found for this brand in Metricool.
                    </div>
                )}

                {headerTabs.includes(activeNetwork) && activeNetwork === "instagram" && (
                    <InstagramView
                        range={range}
                        onRangeChange={setRange}
                        customFrom={customFrom}
                        customTo={customTo}
                        blogId={selectedBlogId ?? undefined}
                        onDateRangeChange={(newFrom, newTo, presetKey) => {
                            setCustomFrom(newFrom);
                            setCustomTo(newTo);
                            setRange("custom");
                        }}
                    />
                )}

                {headerTabs.includes(activeNetwork) && activeNetwork === "facebook" && (
                    <FacebookView
                        range={range}
                        onRangeChange={setRange}
                        customFrom={customFrom}
                        customTo={customTo}
                        blogId={selectedBlogId ?? undefined}
                        onDateRangeChange={(newFrom, newTo, presetKey) => {
                            setCustomFrom(newFrom);
                            setCustomTo(newTo);
                            setRange("custom");
                        }}
                    />
                )}

                {headerTabs.includes(activeNetwork) && activeNetwork === "youtube" && (
                    <YouTubeView
                        range={range}
                        onRangeChange={setRange}
                        customFrom={customFrom}
                        customTo={customTo}
                        blogId={selectedBlogId ?? undefined}
                        onDateRangeChange={(newFrom, newTo, presetKey) => {
                            setCustomFrom(newFrom);
                            setCustomTo(newTo);
                            setRange("custom");
                        }}
                    />
                )}

                {headerTabs.includes(activeNetwork) && activeNetwork === "meta_ads" && (
                    <MetaAdsView
                        range={range}
                        onRangeChange={setRange}
                        customFrom={customFrom}
                        customTo={customTo}
                        blogId={selectedBlogId ?? undefined}
                        onDateRangeChange={(newFrom, newTo, presetKey) => {
                            setCustomFrom(newFrom);
                            setCustomTo(newTo);
                            setRange("custom");
                        }}
                    />
                )}

                {headerTabs.includes(activeNetwork) &&
                    ["linkedin", "tiktok", "twitter", "pinterest"].includes(activeNetwork) && (
                        <GenericSocialView
                            platform={activeNetwork}
                            range={range}
                            onRangeChange={setRange}
                            customFrom={customFrom}
                            customTo={customTo}
                            blogId={selectedBlogId ?? undefined}
                            onDateRangeChange={(newFrom, newTo, presetKey) => {
                                setCustomFrom(newFrom);
                                setCustomTo(newTo);
                                setRange("custom");
                            }}
                        />
                    )}
            </div>
        </div>
    );
}

