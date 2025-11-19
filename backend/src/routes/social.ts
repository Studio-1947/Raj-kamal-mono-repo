import express from 'express';
import { z } from 'zod';
import {
  METRICOOL_ADMIN_PROFILE_PATH,
  METRICOOL_ANALYTICS_DISTRIBUTION_PATH,
  METRICOOL_ANALYTICS_ENDPOINT_FACEBOOK,
  METRICOOL_ANALYTICS_ENDPOINT_INSTAGRAM,
  METRICOOL_ANALYTICS_ENDPOINT_LINKEDIN,
  METRICOOL_ANALYTICS_ENDPOINT_OVERVIEW,
  METRICOOL_ANALYTICS_ENDPOINT_TIKTOK,
  METRICOOL_ANALYTICS_ENDPOINT_TWITTER,
  METRICOOL_ANALYTICS_ENDPOINT_YOUTUBE,
  METRICOOL_ANALYTICS_TIMELINES_PATH,
  METRICOOL_BRAND_ID,
  METRICOOL_BLOG_ID,
  METRICOOL_DEFAULT_TIMEZONE,
  METRICOOL_USER_ID,
  buildMetricoolAnalyticsParams,
  metricoolRequest,
} from '../config/metricool.js';

const router = express.Router();

const overviewQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  brandId: z.string().optional(),
  timezone: z.string().optional(),
});

type SocialNetworkKey = 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'tiktok' | string;

export type SocialNetworkOverview = {
  network: SocialNetworkKey;
  followers: number | null;
  impressions: number | null;
  reach: number | null;
  engagementRate: number | null;
  posts: number | null;
};

export type SocialOverviewResponse = {
  ok: true;
  timeframe: {
    from: string | null;
    to: string | null;
    timezone: string;
  };
  brandId: string | null;
  networks: SocialNetworkOverview[];
};

type RawMetricoolOverview = unknown;

const networkEndpointMap: Record<string, string | null> = {
  facebook: METRICOOL_ANALYTICS_ENDPOINT_FACEBOOK || null,
  instagram: METRICOOL_ANALYTICS_ENDPOINT_INSTAGRAM || null,
  twitter: METRICOOL_ANALYTICS_ENDPOINT_TWITTER || null,
  linkedin: METRICOOL_ANALYTICS_ENDPOINT_LINKEDIN || null,
  youtube: METRICOOL_ANALYTICS_ENDPOINT_YOUTUBE || null,
  tiktok: METRICOOL_ANALYTICS_ENDPOINT_TIKTOK || null,
};

const networkQuerySchema = overviewQuerySchema.extend({
  network: z.string(),
});

function normalizeOverviewPayload(
  raw: RawMetricoolOverview,
  params: {
    from: string | null;
    to: string | null;
    timezone: string;
    brandId: string | null;
  }
) {
  const networks: SocialNetworkOverview[] = [];

  return {
    ok: true,
    timeframe: {
      from: params.from,
      to: params.to,
      timezone: params.timezone,
    },
    brandId: params.brandId,
    networks,
  };
}

router.get('/overview', async (req, res, next) => {
  try {
    const parsed = overviewQuerySchema.parse(req.query);

    const from = parsed.from ?? null;
    const to = parsed.to ?? null;
    const timezone = parsed.timezone ?? METRICOOL_DEFAULT_TIMEZONE;
    const brandId = parsed.brandId ?? METRICOOL_BRAND_ID ?? null;

    const raw = await metricoolRequest<RawMetricoolOverview>({
      endpoint: METRICOOL_ANALYTICS_ENDPOINT_OVERVIEW,
      searchParams: {
        from: from ?? undefined,
        to: to ?? undefined,
        timezone,
        brandId: brandId ?? undefined,
      },
    });

    const normalized = normalizeOverviewPayload(raw, {
      from,
      to,
      timezone,
      brandId,
    });

    res.json(normalized);
  } catch (error) {
    next(error);
  }
});

router.get('/network/:network/overview', async (req, res, next) => {
  try {
    const parsed = networkQuerySchema.parse({
      ...req.query,
      network: req.params.network,
    });

    const network = parsed.network.toLowerCase();
    const endpoint = networkEndpointMap[network];

    if (!endpoint) {
      res.status(400).json({
        ok: false,
        message: `Unsupported or unconfigured network: ${network}`,
      });
      return;
    }

    const from = parsed.from ?? null;
    const to = parsed.to ?? null;
    const timezone = parsed.timezone ?? METRICOOL_DEFAULT_TIMEZONE;
    const brandId = parsed.brandId ?? METRICOOL_BRAND_ID ?? null;

    const raw = await metricoolRequest<unknown>({
      endpoint,
      searchParams: {
        from: from ?? undefined,
        to: to ?? undefined,
        timezone,
        brandId: brandId ?? undefined,
      },
    });

    res.json({
      ok: true,
      network,
      timeframe: {
        from,
        to,
        timezone,
      },
      brandId,
      // For now we expose the full Metricool payload so the frontend
      // can render a rich dashboard without us guessing field names.
      raw,
    });
    return;
  } catch (error) {
    next(error);
  }
});

router.get('/network/:network/dashboard', async (req, res, next) => {
  try {
    const parsed = networkQuerySchema.parse({
      ...req.query,
      network: req.params.network,
    });

    const network = parsed.network.toLowerCase();

    if (network !== 'facebook') {
      res.status(400).json({
        ok: false,
        message: `Dashboard endpoint is currently only configured for facebook. Requested: ${network}`,
      });
      return;
    }

    const from = parsed.from ?? null;
    const to = parsed.to ?? null;
    const timezone = parsed.timezone ?? METRICOOL_DEFAULT_TIMEZONE;
    const brandId = parsed.brandId ?? METRICOOL_BRAND_ID ?? null;

    if (!METRICOOL_USER_ID || !METRICOOL_BLOG_ID) {
      res.status(500).json({
        ok: false,
        message:
          'Metricool userId or blogId is not configured. Please set METRICOOL_USER_ID and METRICOOL_BLOG_ID in the backend .env file.',
      });
      return;
    }

    const profilePromise = metricoolRequest<unknown>({
      endpoint: METRICOOL_ADMIN_PROFILE_PATH,
      searchParams: {
        refreshBrandCache: 'false',
        userId: METRICOOL_USER_ID,
        blogId: METRICOOL_BLOG_ID,
      },
    });

    const distributionMetrics = [
      'postsTypes',
      'reachByLocale',
      'page_follows_country',
      'page_follows_city',
    ];

    const timelineMetrics = ['pageImpressions', 'pageFollows', 'likes'];

    const distributionPromises = distributionMetrics.map(async (metric) => {
      const payload = await metricoolRequest<unknown>({
        endpoint: METRICOOL_ANALYTICS_DISTRIBUTION_PATH,
        searchParams: buildMetricoolAnalyticsParams({
          from: from ? `${from}T00:00:00` : null,
          to: to ? `${to}T23:59:59` : null,
          metric,
          network,
          timezone,
          subject: 'account',
        }),
      });

      return { metric, payload };
    });

    const timelinePromises = timelineMetrics.map(async (metric) => {
      const payload = await metricoolRequest<unknown>({
        endpoint: METRICOOL_ANALYTICS_TIMELINES_PATH,
        searchParams: buildMetricoolAnalyticsParams({
          from: from ? `${from}T00:00:00` : null,
          to: to ? `${to}T23:59:59` : null,
          metric,
          network,
          timezone,
          subject: 'account',
        }),
      });

      return { metric, payload };
    });

    const [profile, distributionResults, timelineResults] = await Promise.all([
      profilePromise,
      Promise.all(distributionPromises),
      Promise.all(timelinePromises),
    ]);

    const distribution: Record<string, unknown> = {};
    for (const item of distributionResults) {
      distribution[item.metric] = item.payload;
    }

    const timelines: Record<string, unknown> = {};
    for (const item of timelineResults) {
      timelines[item.metric] = item.payload;
    }

    res.json({
      ok: true,
      network,
      timeframe: {
        from,
        to,
        timezone,
      },
      brandId,
      profile,
      distribution,
      timelines,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
