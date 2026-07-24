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

function rangeDays(range: string) {
    return range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 30;
}

function isoRange(range: string) {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - rangeDays(range));
    return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/* -------------------------------------------------------------------------- */
/*  Facebook                                                                  */
/* -------------------------------------------------------------------------- */

export function facebookOverviewMock(range: string) {
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

export function facebookGrowthMock(range: string) {
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

export function facebookClicksMock(range: string) {
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

export function instagramOverviewMock(range: string) {
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
        accountsEngaged: 5230,
        from,
        to,
    };
}

export function instagramGrowthMock(range: string) {
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

export function instagramTimelineMock(range: string) {
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

export const instagramGenderMock = [
    { key: "M", value: 62.0 },
    { key: "F", value: 22.0 },
    { key: "U", value: 16.0 },
];

export const instagramAgeMock = [
    { key: "25-34", value: 42.0 },
    { key: "18-24", value: 24.0 },
    { key: "35-44", value: 18.0 },
    { key: "45-54", value: 9.0 },
    { key: "13-17", value: 4.0 },
    { key: "55-64", value: 2.0 },
    { key: "65+", value: 1.0 },
];

export const instagramDemographicsCountriesMock = [
    { key: "IN", value: 68.2 },
    { key: "NP", value: 8.4 },
    { key: "US", value: 5.1 },
    { key: "AE", value: 3.2 },
    { key: "GB", value: 2.6 },
    { key: "PK", value: 2.1 },
    { key: "BD", value: 1.8 },
    { key: "CA", value: 1.4 },
    { key: "SG", value: 1.1 },
    { key: "AU", value: 0.9 },
];

export const instagramDemographicsCitiesMock = [
    { key: "Mumbai, Maharashtra", value: 5240 },
    { key: "Delhi", value: 4380 },
    { key: "Bengaluru, Karnataka", value: 3120 },
    { key: "Kolkata, West Bengal", value: 2640 },
    { key: "Patna, Bihar", value: 2010 },
    { key: "Pune, Maharashtra", value: 1720 },
    { key: "Jaipur, Rajasthan", value: 1380 },
    { key: "Ahmedabad, Gujarat", value: 1140 },
    { key: "Lucknow, Uttar Pradesh", value: 960 },
    { key: "Chennai, Tamil Nadu", value: 820 },
];

export const instagramContentTypesMock = [
    { key: "FEED_CAROUSEL_ALBUM", value: 48.0 },
    { key: "FEED_IMAGE", value: 30.0 },
    { key: "FEED_VIDEO", value: 22.0 },
];

/* -------------------------------------------------------------------------- */
/*  YouTube                                                                   */
/* -------------------------------------------------------------------------- */

export function youtubeOverviewMock(range: string) {
    const { from, to } = isoRange(range);
    return {
        subscribers: 15600,
        views: 42800,
        totalVideos: 6,
        from,
        to,
    };
}

export function youtubeGrowthMock(range: string) {
    const days = rangeDays(range);
    return {
        series: {
            subscribers: buildSeries(days, 15500, 40, 3),
            views: buildSeries(days, 1400, 400, 8),
            subscribersGained: buildSeries(days, 8, 4),
            subscribersLost: buildSeries(days, 2, 1),
        },
    };
}

/* -------------------------------------------------------------------------- */
/*  Generic / Meta Ads / LinkedIn / TikTok / Twitter / Pinterest              */
/* -------------------------------------------------------------------------- */

export function genericOverviewMock(platform: string, range: string) {
    const { from, to } = isoRange(range);
    const platformLabel = platform === "meta_ads" ? "Meta Ads (Sample)" : `${platform.charAt(0).toUpperCase() + platform.slice(1)} (Sample)`;
    return {
        profileName: platformLabel,
        profilePictureUrl: "/favicon.svg",
        likes: 12400,
        followers: 14800,
        reach: 184500,
        impressions: 342000,
        pageVisits: 6200,
        pageViews: 6200,
        totalContent: 45,
        followersChange: 280,
        from,
        to,
    };
}

export function genericGrowthMock(platform: string, range: string) {
    const days = rangeDays(range);
    return {
        series: {
            impressions: { values: buildSeries(days, 12000, 2400, 45) },
            reach: { values: buildSeries(days, 6800, 1400, 25) },
            followers: { values: buildSeries(days, 14500, 100, 10) },
            newFollowers: { values: buildSeries(days, 35, 15) },
            lostFollowers: { values: buildSeries(days, 10, 6) },
        },
    };
}

export const genericDemographicsCountriesMock = [
    { key: "IN", value: 65.0 },
    { key: "US", value: 12.5 },
    { key: "AE", value: 5.8 },
    { key: "GB", value: 4.2 },
    { key: "SG", value: 3.5 },
    { key: "CA", value: 2.8 },
    { key: "AU", value: 2.2 },
    { key: "NP", value: 2.0 },
    { key: "BD", value: 2.0 },
];

export function genericPostsMock(platform: string) {
    const label = platform === "meta_ads" ? "Ad Campaign" : `${platform.charAt(0).toUpperCase() + platform.slice(1)} Post`;
    return [
        { id: `${platform}-1`, date: new Date().toISOString().slice(0, 10), message: `${label}: Summer book festival special promotion 📚✨`, mediaType: "Campaign", impressions: 45200, reach: 28400, engagement: 3620, likes: 2980, comments: 164, shares: 240 },
        { id: `${platform}-2`, date: new Date().toISOString().slice(0, 10), message: `${label}: New bestseller pre-orders now active 💛`, mediaType: "Campaign", impressions: 38400, reach: 23100, engagement: 2940, likes: 2350, comments: 128, shares: 196 },
        { id: `${platform}-3`, date: new Date().toISOString().slice(0, 10), message: `${label}: Author interview highlight reel 🎬`, mediaType: "Video", impressions: 31600, reach: 19800, engagement: 2450, likes: 1920, comments: 104, shares: 162 },
        { id: `${platform}-4`, date: new Date().toISOString().slice(0, 10), message: `${label}: Featured collection release 📖`, mediaType: "Image", impressions: 26800, reach: 16500, engagement: 2080, likes: 1610, comments: 84, shares: 128 },
    ];
}

/* -------------------------------------------------------------------------- */
/*  Meta Ads (Facebook Ads & Instagram Ads) Dedicated Mocks                   */
/* -------------------------------------------------------------------------- */

export function metaAdsOverviewMock(range: string) {
    const { from, to } = isoRange(range);
    return {
        accountName: "Rajkamal Meta Ad Account (Sample)",
        spend: 48250,
        impressions: 582400,
        reach: 312800,
        clicks: 18420,
        ctr: 3.16,
        cpc: 2.62,
        cpm: 82.85,
        conversions: 842,
        roas: 4.25,
        from,
        to,
    };
}

export function metaAdsSeriesMock(range: string) {
    const days = rangeDays(range);
    return {
        spend: buildSeries(days, 1600, 300, 10),
        impressions: buildSeries(days, 19000, 3500, 100),
        reach: buildSeries(days, 10500, 1800, 50),
        clicks: buildSeries(days, 610, 120, 4),
    };
}

export const metaAdsCampaignsMock = [
    {
        id: "meta-ad-1",
        name: "Sales_BookSet_July2026_AdvPlus",
        status: "ACTIVE",
        type: "OUTCOME_SALES",
        spend: 1925.55,
        impressions: 25650,
        reach: 11770,
        clicks: 662,
        ctr: 2.58,
        cpc: 2.91,
        cpm: 75.07,
        conversions: 1,
        conversionType: "Leads",
        format: "SALES AD",
        adHeadline: "ग्रীষ্মकालीन पुस्तक महोत्सव — राजकमल सेल्स बुकसेट 2026 — विशेष छूट पर उपलब्ध 📚✨",
        creativeImage: "/images/ads/meta_ad_summer_fest_1784881794246.png",
        adUrl: "https://www.facebook.com/ads/library/?id=Sales_BookSet_July2026_AdvPlus",
    },
    {
        id: "meta-ad-2",
        name: "Website Sales Meri Maan Meri Gangster",
        status: "ACTIVE",
        type: "OUTCOME_SALES",
        spend: 1097.05,
        impressions: 86930,
        reach: 78750,
        clicks: 1400,
        ctr: 1.61,
        cpc: 0.79,
        cpm: 12.62,
        conversions: 946,
        conversionType: "Link clicks",
        format: "WEBSITE SALES",
        adHeadline: "अरुंधति रॉय की बहुचर्चित किताब ‘मेरी माँ मेरी गैंगस्टर’ — आधिकारिक वेबसाइट पर अभी ऑर्डर करें 💛",
        creativeImage: "/images/ads/meta_ad_new_release_1784881808811.png",
        adUrl: "https://www.facebook.com/ads/library/?id=Website_Sales_Meri_Maan_Meri_Gangster",
    },
    {
        id: "meta-ad-3",
        name: "Book set new Catalogue ad_July",
        status: "ACTIVE",
        type: "OUTCOME_SALES",
        spend: 928.00,
        impressions: 18760,
        reach: 12810,
        clicks: 665,
        ctr: 3.54,
        cpc: 1.40,
        cpm: 49.47,
        conversions: 334,
        conversionType: "Link clicks",
        format: "CATALOG AD",
        adHeadline: "नया कैटलॉग जुलाई 2026 — राजकमल की क्लासिक एवं नवीन कृतियों का नया संग्रह 📖",
        creativeImage: "/images/ads/meta_ad_lead_gen_1784881826832.png",
        adUrl: "https://www.facebook.com/ads/library/?id=Book_set_new_Catalogue_ad_July",
    },
    {
        id: "meta-ad-4",
        name: "Mumbai, Prayagraj, Patna, New Delhi location based awareness ad",
        status: "ACTIVE",
        type: "OUTCOME_AWARENESS",
        spend: 525.60,
        impressions: 211940,
        reach: 206310,
        clicks: 300,
        ctr: 0.14,
        cpc: 1.75,
        cpm: 2.48,
        conversions: 133,
        conversionType: "Link clicks",
        format: "AWARENESS AD",
        adHeadline: "दिल्ली, मुंबई, प्रयागराज और पटना पुस्तक मेला — निःशुल्क प्रवेश पास एवं विशेष आमंत्रण 🎟️",
        creativeImage: "/images/ads/meta_ad_retargeting_1784881841450.png",
        adUrl: "https://www.facebook.com/ads/library/?id=Location_Based_Awareness_Ad",
    },
    {
        id: "meta-ad-5",
        name: "Amazon Awareness Meri Maan Meri Gangster",
        status: "ACTIVE",
        type: "OUTCOME_AWARENESS",
        spend: 320.48,
        impressions: 206760,
        reach: 200580,
        clicks: 176,
        ctr: 0.09,
        cpc: 1.82,
        cpm: 1.55,
        conversions: 142,
        conversionType: "Link clicks",
        format: "AMAZON AD",
        adHeadline: "अमेज़न बेस्टसेलर — ‘मेरी माँ मेरी गैंगस्टर’ (Mother Mary Comes To Me) — अभी अमेज़न से मँगवाएँ 🛒",
        creativeImage: "/images/ads/meta_ad_retargeting_1784881841450.png",
        adUrl: "https://www.facebook.com/ads/library/?id=Amazon_Awareness_Meri_Maan_Meri_Gangster",
    },
];


