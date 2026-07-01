/**
 * Mock / sample data for the Social Media dashboard.
 *
 * These are used as a graceful fallback so the UI stays fully populated
 * (charts, cards, tables) whenever the live Metricool data is unavailable —
 * e.g. the backend is offline, the account isn't connected yet, or the
 * Metricool API is rate-limited. Anything rendered from this module should be
 * clearly badged as "Sample data" in the UI so it is never mistaken for real
 * metrics.
 */

type SeriesPoint = { dateTime: string; value: number };

/** Build a smooth-ish daily series ending today, going back `days` days. */
function buildSeries(days: number, base: number, variance: number, trend = 0): SeriesPoint[] {
    const points: SeriesPoint[] = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const wobble = Math.sin(i / 2) * variance;
        const drift = trend * (days - i);
        const value = Math.max(0, Math.round(base + wobble + drift));
        points.push({ dateTime: d.toISOString().slice(0, 10), value });
    }
    return points;
}

function rangeDays(range: "7d" | "30d" | "90d") {
    return range === "7d" ? 7 : range === "30d" ? 30 : 90;
}

function isoRange(range: "7d" | "30d" | "90d") {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - rangeDays(range));
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/* -------------------------------------------------------------------------- */
/*  Facebook                                                                  */
/* -------------------------------------------------------------------------- */

export function facebookOverviewMock(range: "7d" | "30d" | "90d") {
    const { from, to } = isoRange(range);
    return {
        profileName: "Rajkamal Prakashan (Sample)",
        profilePictureUrl: "/favicon.svg",
        likes: 18420,
        followers: 19875,
        reach: 246300,
        impressions: 512400,
        pageVisits: 8420,
        pageViews: 8420,
        totalContent: 142,
        followersChange: 315,
        from,
        to,
    };
}

export function facebookGrowthMock(range: "7d" | "30d" | "90d") {
    const days = rangeDays(range);
    return {
        series: {
            impressions: { values: buildSeries(days, 16000, 3200, 60) },
            reach: { values: buildSeries(days, 8200, 1800, 30) },
            followers: { values: buildSeries(days, 19500, 120, 12) },
            newFollowers: { values: buildSeries(days, 46, 22) },
            lostFollowers: { values: buildSeries(days, 14, 9) },
        },
    };
}

export function facebookClicksMock(range: "7d" | "30d" | "90d") {
    const days = rangeDays(range);
    return { values: buildSeries(days, 320, 140, 4) };
}

export const facebookDemographicsCountriesMock = [
    { key: "IN", value: 62.4 },
    { key: "US", value: 11.8 },
    { key: "AE", value: 6.3 },
    { key: "GB", value: 4.1 },
    { key: "SG", value: 3.2 },
    { key: "CA", value: 2.7 },
    { key: "AU", value: 2.1 },
    { key: "BD", value: 1.9 },
    { key: "NP", value: 1.4 },
    { key: "DE", value: 1.1 },
];

export const facebookDemographicsCitiesMock = [
    { key: "Mumbai", value: 4820 },
    { key: "Delhi", value: 3910 },
    { key: "Bengaluru", value: 3180 },
    { key: "Kolkata", value: 2640 },
    { key: "Chennai", value: 2210 },
    { key: "Hyderabad", value: 1980 },
    { key: "Pune", value: 1750 },
    { key: "Ahmedabad", value: 1420 },
    { key: "Jaipur", value: 1180 },
    { key: "Surat", value: 990 },
];

function buildPostsMock(prefix: string) {
    const messages = [
        "New release: our latest Hindi fiction title is now in stores 📚",
        "In conversation with the author — watch the full interview 🎙️",
        "Bestseller back in print! Grab your copy today ✨",
        "Book of the week: a modern classic you shouldn't miss 📖",
        "Thank you for being part of our reading community 💛 #RajkamalPrakashan",
    ];
    return messages.map((message, i) => ({
        id: `${prefix}-post-${i + 1}`,
        picture: "",
        message,
        mediaType: i % 2 === 0 ? "PHOTO" : "VIDEO",
        impressions: 24000 - i * 3200,
        reach: 15200 - i * 2100,
        engagement: 1820 - i * 240,
        clicks: 640 - i * 80,
        likes: 1240 - i * 160,
        comments: 96 - i * 12,
        shares: 74 - i * 9,
    }));
}

export const facebookPostsMock = buildPostsMock("fb");

export const facebookReelsMock = {
    items: [
        { id: "fb-reel-1", picture: "", message: "Book trailer: this month's most awaited release 🎬📚", mediaType: "Reel", impressions: 68200, reach: 41200, engagement: 5400, likes: 4210, comments: 182, shares: 640 },
        { id: "fb-reel-2", picture: "", message: "60 seconds with the author ✍️", mediaType: "Reel", impressions: 52100, reach: 33800, engagement: 4120, likes: 3180, comments: 143, shares: 512 },
        { id: "fb-reel-3", picture: "", message: "Unboxing the new hardcover edition 📦📖", mediaType: "Reel", impressions: 41800, reach: 27500, engagement: 3240, likes: 2510, comments: 108, shares: 388 },
    ],
};

export const facebookStoriesMock = {
    items: [
        { id: "fb-story-1", picture: "", text: "Pre-orders open for the new release!", mediaType: "Story", impressions: 8400, impressionsUnique: 7120, engagement: 320, reactions: 210, comments: 18, shares: 42 },
        { id: "fb-story-2", picture: "", text: "Meet us at the Delhi Book Fair 📚", mediaType: "Story", impressions: 7200, impressionsUnique: 6050, engagement: 280, reactions: 176, comments: 12, shares: 31 },
        { id: "fb-story-3", picture: "", text: "Poll: which title should we reprint next?", mediaType: "Story", impressions: 6100, impressionsUnique: 5240, engagement: 410, reactions: 240, comments: 26, shares: 19 },
    ],
};

export const facebookCompetitorsMock = {
    items: [
        { id: "fb-comp-1", displayName: "Vani Prakashan", picture: "", followers: 24800, posts: 38, reactions: 9200, comments: 620, shares: 480, engagement: 0.041 },
        { id: "fb-comp-2", displayName: "Penguin India", picture: "", followers: 18200, posts: 44, reactions: 7100, comments: 540, shares: 390, engagement: 0.038 },
        { id: "fb-comp-3", displayName: "Rajpal & Sons", picture: "", followers: 15600, posts: 29, reactions: 5400, comments: 410, shares: 280, engagement: 0.034 },
    ],
};

/* -------------------------------------------------------------------------- */
/*  Instagram                                                                 */
/* -------------------------------------------------------------------------- */

export function instagramOverviewMock(range: "7d" | "30d" | "90d") {
    const { from, to } = isoRange(range);
    return {
        profileName: "rajkamalprakashan (Sample)",
        profilePictureUrl: "/favicon.svg",
        likes: 32800,
        followers: 41250,
        reach: 318700,
        impressions: 684200,
        pageVisits: 12640,
        pageViews: 12640,
        totalContent: 208,
        followersChange: 540,
        from,
        to,
    };
}

export function instagramGrowthMock(range: "7d" | "30d" | "90d") {
    const days = rangeDays(range);
    return {
        series: {
            impressions: { values: buildSeries(days, 21000, 4200, 90) },
            reach: { values: buildSeries(days, 11200, 2400, 40) },
            followers: { values: buildSeries(days, 40800, 180, 18) },
            newFollowers: { values: buildSeries(days, 72, 34) },
            lostFollowers: { values: buildSeries(days, 21, 12) },
        },
    };
}

function buildInstagramItems(prefix: string, label: string) {
    return [
        { id: `${prefix}-1`, picture: "", content: `${label}: new title reveal 📚✨`, mediaType: label, impressions: 38200, reach: 24100, engagement: 3120, likes: 2680, comments: 142, shares: 210 },
        { id: `${prefix}-2`, picture: "", content: `${label}: bestseller back in print 💛`, mediaType: label, impressions: 31400, reach: 20800, engagement: 2740, likes: 2210, comments: 118, shares: 176 },
        { id: `${prefix}-3`, picture: "", content: `${label}: an excerpt worth reading 📖`, mediaType: label, impressions: 27600, reach: 18300, engagement: 2310, likes: 1890, comments: 96, shares: 148 },
        { id: `${prefix}-4`, picture: "", content: `${label}: readers' picks of the month`, mediaType: label, impressions: 22800, reach: 15400, engagement: 1980, likes: 1520, comments: 78, shares: 112 },
    ];
}

export function instagramTimelineMock(range: "7d" | "30d" | "90d") {
    return { data: [{ values: buildSeries(rangeDays(range), 18000, 3600, 70) }] };
}

export const instagramPostsMock = { items: buildInstagramItems("ig-post", "Post"), timeline: null as any };
export const instagramReelsMock = { items: buildInstagramItems("ig-reel", "Reel"), timeline: null as any };
export const instagramStoriesMock = { items: buildInstagramItems("ig-story", "Story"), timeline: null as any };
export const instagramCommunityMock = { items: buildInstagramItems("ig-comm", "Post"), timeline: null as any };
export const instagramCompetitorsMock = {
    items: [
        { id: "ig-comp-1", displayName: "Vani Prakashan", picture: "", followers: 52800, posts: 61, likes: 14200, comments: 920, shares: 610, engagement: 0.046 },
        { id: "ig-comp-2", displayName: "Penguin India", picture: "", followers: 38400, posts: 74, likes: 10800, comments: 740, shares: 520, engagement: 0.041 },
        { id: "ig-comp-3", displayName: "HarperCollins India", picture: "", followers: 29600, posts: 48, likes: 8100, comments: 560, shares: 380, engagement: 0.037 },
    ],
    timeline: null as any,
};

/* -------------------------------------------------------------------------- */
/*  Meta Ads                                                                  */
/* -------------------------------------------------------------------------- */

export const metaAdsOverviewMock = {
    spend: 184200,
    impressions: 1240000,
    reach: 682000,
    clicks: 28400,
    ctr: 2.29,
    cpc: 6.49,
    conversions: 1420,
    roas: 4.8,
};

export function metaAdsTimeseriesMock(range: "7d" | "30d" | "90d") {
    const days = rangeDays(range);
    return {
        series: {
            spend: { values: buildSeries(days, 6200, 1400, 20) },
            impressions: { values: buildSeries(days, 41000, 9000, 200) },
            clicks: { values: buildSeries(days, 940, 320, 6) },
        },
    };
}

export const metaAdsCampaignsMock = [
    { id: "camp-1", campaignName: "New Release Launch — Prospecting", objective: "CONVERSIONS", spend: 72400, status: "ACTIVE", startDate: "2026-06-01", endDate: "2026-06-30" },
    { id: "camp-2", campaignName: "Retargeting — Cart Abandoners", objective: "CONVERSIONS", spend: 48100, status: "ACTIVE", startDate: "2026-06-05", endDate: "2026-06-30" },
    { id: "camp-3", campaignName: "Book Fair Awareness — Reels", objective: "REACH", spend: 36200, status: "PAUSED", startDate: "2026-05-15", endDate: "2026-06-15" },
    { id: "camp-4", campaignName: "Bestsellers Catalogue — Traffic", objective: "TRAFFIC", spend: 27500, status: "ACTIVE", startDate: "2026-06-10", endDate: "2026-07-10" },
];
