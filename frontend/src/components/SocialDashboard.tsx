import { useEffect, useState } from "react";
import { useLang } from "../modules/lang/LangContext";
import InstagramView from "./InstagramView";
import FacebookView from "./FacebookView";
import {
    fetchConnectedNetworks,
    type ConnectedNetworks,
    type PlatformKey,
} from "../services/metricoolApi";

type TimeRangeKey = "7d" | "30d" | "90d";

// Networks we have a real dashboard view for. Metricool may have other
// networks connected (YouTube, LinkedIn, etc.) but we only show a tab once
// there's an actual view built for it — no "Coming Soon" placeholders.
const IMPLEMENTED_NETWORKS: PlatformKey[] = ["facebook", "instagram"];

export default function SocialDashboard() {
    const { t } = useLang();

    const [range, setRange] = useState<TimeRangeKey>("30d");
    const [activeNetwork, setActiveNetwork] = useState<PlatformKey>("facebook");
    const [connected, setConnected] = useState<ConnectedNetworks | null>(null);

    useEffect(() => {
        let cancelled = false;
        fetchConnectedNetworks()
            .then((data) => {
                if (!cancelled) setConnected(data);
            })
            .catch((err) => {
                console.warn("Failed to load connected Metricool networks", err);
                if (!cancelled) setConnected(null);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    // Fail open: if the connected-networks check itself fails, still show
    // every implemented tab rather than blanking the dashboard.
    const headerTabs: PlatformKey[] = connected
        ? IMPLEMENTED_NETWORKS.filter((key) => connected[key])
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
                <div>
                    <h1 className="text-2xl sm:text-3xl font-normal text-gray-900">
                        {t("social_media")}
                    </h1>
                    <p className="mt-1 text-sm text-gray-600">
                        Metricool analytics for {connected?.brandLabel || "your connected accounts"}.
                    </p>
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
                <InstagramView range={range} onRangeChange={setRange} />
            )}

            {headerTabs.includes(activeNetwork) && activeNetwork === "facebook" && (
                <FacebookView range={range} onRangeChange={setRange} />
            )}
        </div>
    );
}
