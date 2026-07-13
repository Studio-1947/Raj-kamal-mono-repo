import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useLang } from "../modules/lang/LangContext";
import InstagramView from "./InstagramView";
import FacebookView from "./FacebookView";
import YouTubeView from "./YouTubeView";
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
} from "react-icons/fa";

type TimeRangeKey = "7d" | "30d" | "90d";

// Networks we have a real dashboard view for. Metricool may have other
// networks connected (YouTube, LinkedIn, etc.) but we only show a tab once
// there's an actual view built for it — no "Coming Soon" placeholders.
const IMPLEMENTED_NETWORKS: PlatformKey[] = ["facebook", "instagram", "youtube"];

const SELECTED_BRAND_STORAGE_KEY = "metricool_selected_blog_id";

const NETWORK_ICONS: Partial<Record<keyof NetworkFlags, { Icon: ComponentType<{ className?: string }>; color: string }>> = {
    facebook: { Icon: FaFacebook, color: "text-[#1877F2]" },
    instagram: { Icon: FaInstagram, color: "text-[#E1306C]" },
    youtube: { Icon: FaYoutube, color: "text-[#FF0000]" },
    linkedin: { Icon: FaLinkedin, color: "text-[#0A66C2]" },
    tiktok: { Icon: FaTiktok, color: "text-gray-900" },
    twitter: { Icon: FaTwitter, color: "text-[#1DA1F2]" },
    pinterest: { Icon: FaPinterest, color: "text-[#E60023]" },
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
    const [activeNetwork, setActiveNetwork] = useState<PlatformKey>("facebook");

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
                // If nothing selected yet, or the stored selection no longer exists
                // on this account, fall back to the first brand Metricool returns.
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

    // Derived synchronously from `brands` (already loaded) instead of a
    // separate per-brand fetch — no fetch means no gap where a view can
    // render against a brand that doesn't actually support that network.
    // Fail open before brands have loaded, so the dashboard isn't blank.
    const headerTabs: PlatformKey[] = selectedBrand
        ? IMPLEMENTED_NETWORKS.filter((key) => selectedBrand[key])
        : IMPLEMENTED_NETWORKS;

    useEffect(() => {
        if (headerTabs.length > 0 && !headerTabs.includes(activeNetwork)) {
            setActiveNetwork(headerTabs[0]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [headerTabs.join(",")]);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-normal text-gray-900">
                            {t("social_media")}
                        </h1>
                        <p className="mt-1 text-sm text-gray-600">
                            Metricool analytics for {selectedBrand?.label || "your connected accounts"}.
                        </p>
                    </div>

                    {brands.length > 0 && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setSwitcherOpen((open) => !open)}
                                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white pl-1.5 pr-3 py-1.5 shadow-sm hover:bg-gray-50"
                            >
                                {selectedBrand && <BrandAvatar brand={selectedBrand} />}
                                <span className="text-xs font-normal text-gray-900 max-w-[140px] truncate">
                                    {selectedBrand?.label ?? "Select brand"}
                                </span>
                                <span className="text-gray-400 text-xs">▾</span>
                            </button>

                            {switcherOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setSwitcherOpen(false)}
                                    />
                                    <div className="absolute left-0 z-20 mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-lg py-2">
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
                    )}
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs font-normal text-gray-700">
                        {headerTabs.map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setActiveNetwork(key)}
                                className={`px-3 py-1 rounded-full capitalize ${activeNetwork === key ? "bg-white shadow-sm" : ""
                                    }`}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                    <div className="inline-flex rounded-full bg-gray-100 p-1 text-xs font-normal text-gray-700">
                        {["7d", "30d", "90d"].map((key) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => setRange(key as TimeRangeKey)}
                                className={`px-3 py-1 rounded-full ${range === key ? "bg-white shadow-sm" : ""
                                    }`}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {headerTabs.length === 0 && (
                <div className="rounded-3xl border border-black/5 bg-white shadow-sm p-6 text-sm text-gray-600">
                    No connected social accounts were found for this brand in Metricool.
                </div>
            )}

            {headerTabs.includes(activeNetwork) && activeNetwork === "instagram" && (
                <InstagramView range={range} onRangeChange={setRange} blogId={selectedBlogId ?? undefined} />
            )}

            {headerTabs.includes(activeNetwork) && activeNetwork === "facebook" && (
                <FacebookView range={range} onRangeChange={setRange} blogId={selectedBlogId ?? undefined} />
            )}

            {headerTabs.includes(activeNetwork) && activeNetwork === "youtube" && (
                <YouTubeView range={range} onRangeChange={setRange} blogId={selectedBlogId ?? undefined} />
            )}
        </div>
    );
}
