import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    fetchOverview,
} from "../../services/metricoolApi";
import { apiClient } from "../../lib/apiClient";
import { FaFacebook, FaInstagram } from "react-icons/fa";

/**
 * Compact Social Media Overview Card
 * Shows key metrics in a small, clickable card format
 */

type PlatformMetrics = {
    platform: "instagram" | "facebook";
    followers: number;
    views: number;
    engagement: number;
    impressions: number;
    loading: boolean;
    error?: string;
};

const platformConfig = {
    instagram: {
        name: "Instagram",
        icon: FaInstagram,
        iconColor: "#E4405F",
    },
    facebook: {
        name: "Facebook",
        icon: FaFacebook,
        iconColor: "#1877F2",
    },
};

function formatNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
}

function calculateGrowth(current: number, previous: number): string {
    if (previous === 0) return "+0%";
    const growth = ((current - previous) / previous) * 100;
    return growth >= 0 ? `+${growth.toFixed(0)}%` : `${growth.toFixed(0)}%`;
}

export default function SocialMediaOverview() {
    const navigate = useNavigate();
    const [metrics, setMetrics] = useState<PlatformMetrics[]>([
        {
            platform: "instagram",
            followers: 0,
            views: 0,
            engagement: 0,
            impressions: 0,
            loading: true,
        },
        {
            platform: "facebook",
            followers: 0,
            views: 0,
            engagement: 0,
            impressions: 0,
            loading: true,
        },
    ]);

    useEffect(() => {
        const loadMetrics = async () => {
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);

            const params = {
                from: thirtyDaysAgo.toISOString().slice(0, 10),
                to: today.toISOString().slice(0, 10),
            };

            // Fetch Instagram metrics
            try {
                // Fetch timeline data for Instagram
                const fetchInstagramTimeline = async (metric: string) => {
                    const response = await apiClient.get<{ success: boolean; data: any }>('/metricool/instagram/timeline', {
                        params: {
                            metric,
                            subject: 'account',
                            timezone: 'Asia/Kolkata',
                            ...params,
                        },
                        timeout: 60000,
                    });
                    return response.data.data;
                };

                // Helper to extract series values from timeline response
                // fetchInstagramTimeline returns response.data.data which is the array directly
                // Structure: [{ metric: "followers", values: [{dateTime, value}] }]
                const extractSeriesValues = (payload: any): any[] => {
                    if (!payload) return [];

                    // If payload is an array (which it should be from response.data.data)
                    if (Array.isArray(payload)) {
                        const first = payload[0];
                        if (first && Array.isArray(first.values)) {
                            return first.values;
                        }
                        // If it's already the values array
                        return payload;
                    }

                    // Fallback: check for nested structures
                    if (payload?.data && Array.isArray(payload.data)) {
                        const first = payload.data[0];
                        if (first && Array.isArray(first.values)) {
                            return first.values;
                        }
                    }

                    if (Array.isArray(payload?.values)) {
                        return payload.values;
                    }

                    return [];
                };

                // Helper to extract latest value from timeline
                const getLatestValue = (payload: any): number => {
                    const values = extractSeriesValues(payload);
                    if (!values || values.length === 0) return 0;
                    // Sort by dateTime to get the most recent value
                    const sorted = [...values].sort((a, b) =>
                        new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
                    );
                    const latest = sorted[0];
                    return typeof latest?.value === 'number' ? latest.value : 0;
                };

                // Helper to sum all values from timeline
                const sumValues = (payload: any): number => {
                    const values = extractSeriesValues(payload);
                    if (!values || values.length === 0) return 0;
                    return values.reduce((sum: number, item: any) => {
                        const val = typeof item?.value === 'number' ? item.value : 0;
                        return sum + val;
                    }, 0);
                };

                // Fetch Instagram metrics (followers, impressions, reach, engagement)
                const [followersData, impressionsData, reachData, engagementData] = await Promise.all([
                    fetchInstagramTimeline('followers').catch(() => null),
                    fetchInstagramTimeline('impressions').catch(() => null),
                    fetchInstagramTimeline('reach').catch(() => null),
                    fetchInstagramTimeline('postsInteractions').catch(() => null),
                ]);

                // Extract metrics
                const followers = getLatestValue(followersData);
                const impressions = sumValues(impressionsData);
                const reach = sumValues(reachData);
                const engagement = sumValues(engagementData);

                console.log("Instagram metrics extracted:", {
                    followers,
                    impressions,
                    reach,
                    engagement,
                    rawData: { followersData, impressionsData, reachData, engagementData }
                });

                setMetrics((prev) =>
                    prev.map((m) =>
                        m.platform === "instagram"
                            ? {
                                ...m,
                                followers: followers,
                                views: reach || impressions, // Use reach, fallback to impressions
                                engagement: engagement,
                                impressions: impressions,
                                loading: false,
                            }
                            : m
                    )
                );
            } catch (error: any) {
                console.error("Instagram metrics error:", error);
                setMetrics((prev) =>
                    prev.map((m) =>
                        m.platform === "instagram"
                            ? { ...m, loading: false, error: error.message }
                            : m
                    )
                );
            }

            // Fetch Facebook metrics
            try {
                const fbData = await fetchOverview("facebook", params);
                console.log("Facebook API Response:", fbData);
                console.log("Facebook data fields:", fbData.data);

                const fbMetrics = fbData.data as any;

                // The fetchOverview returns: likes, followers, views (pageImpressions), pageVisits
                // Map these to our display fields
                const followers = fbMetrics?.followers || 0;
                const views = fbMetrics?.pageVisits || 0; // Use pageVisits for views
                const likes = fbMetrics?.likes || 0; // This is engagement
                const impressions = fbMetrics?.views || 0; // pageImpressions is stored as 'views'

                console.log("Facebook metrics extracted:", {
                    followers,
                    views,
                    likes,
                    impressions,
                });

                setMetrics((prev) =>
                    prev.map((m) =>
                        m.platform === "facebook"
                            ? {
                                ...m,
                                followers: followers,
                                views: views,
                                engagement: likes,
                                impressions: impressions,
                                loading: false,
                            }
                            : m
                    )
                );
            } catch (error: any) {
                console.error("Facebook metrics error:", error);
                setMetrics((prev) =>
                    prev.map((m) =>
                        m.platform === "facebook"
                            ? { ...m, loading: false, error: error.message }
                            : m
                    )
                );
            }
        };

        loadMetrics();
    }, []);

    const handleCardClick = (platform: string) => {
        navigate("/social", { state: { platform } });
    };

    return (
        <section className="rounded-[22px] border border-black/10 bg-white shadow-sm p-5 mb-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="font-semibold text-[15px] text-[#000000]">
                        Social Media
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold border border-black/5 bg-[#E9F7EF] text-[#1E7B4F]">
                        All Good
                    </span>
                </div>
                <button
                    onClick={() => navigate("/social")}
                    className="text-sm font-semibold text-[#3856B8] hover:underline"
                >
                    Know More
                </button>
            </div>

            {/* Platform Cards Grid - Only 2 columns now */}
            <div className="grid grid-cols-2 gap-4">
                {metrics.map((metric) => {
                    const config = platformConfig[metric.platform];
                    const Icon = config.icon;

                    return (
                        <div
                            key={metric.platform}
                            onClick={() => handleCardClick(metric.platform)}
                            className="flex flex-col items-center text-center p-4 rounded-xl bg-white border border-black/5 hover:shadow-lg transition-all cursor-pointer group"
                        >
                            {/* Icon */}
                            <div className="mb-3 p-3 rounded-full bg-gray-50 group-hover:scale-110 transition-transform">
                                <Icon
                                    className="w-6 h-6"
                                    style={{ color: config.iconColor }}
                                />
                            </div>

                            {/* Platform Name */}
                            <div className="text-xs font-medium text-gray-600 mb-1">
                                {config.name}
                            </div>

                            {/* Main Metric */}
                            {metric.loading ? (
                                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                            ) : metric.error ? (
                                <div className="text-xs text-amber-600 mb-1">Unavailable</div>
                            ) : (
                                <>
                                    <div className="text-2xl font-extrabold text-[#43547E] mb-1">
                                        {metric.followers > 0 ? formatNumber(metric.followers) : "—"}
                                    </div>
                                    <div className="text-[11px] text-gray-500 mb-2">
                                        {metric.followers > 0 ? "followers" : "No data"}
                                    </div>
                                </>
                            )}

                            {/* Growth Badge */}
                            {!metric.loading && !metric.error && metric.followers > 0 && (
                                <div className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                                    {calculateGrowth(metric.followers, metric.followers * 0.95)}
                                </div>
                            )}

                            {/* Secondary Metrics - Show for both platforms */}
                            {!metric.loading && !metric.error && metric.followers > 0 && (
                                <div className="mt-3 pt-3 border-t border-gray-100 w-full space-y-1">
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-gray-500">Views</span>
                                        <span className="font-semibold text-[#43547E]">
                                            {formatNumber(metric.views)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-gray-500">Engagement</span>
                                        <span className="font-semibold text-[#43547E]">
                                            {formatNumber(metric.engagement)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-[10px]">
                                        <span className="text-gray-500">Impressions</span>
                                        <span className="font-semibold text-[#43547E]">
                                            {formatNumber(metric.impressions)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
