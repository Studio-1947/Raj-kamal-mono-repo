import express from "express";
import { z } from "zod";
import { authenticateToken } from "../middleware/authPrisma.js";
import {
  fetchDistribution,
  fetchTimeline,
  fetchPosts,
  fetchCompetitors,
  fetchConnectedNetworks,
  listBrands,
} from "../services/metricoolService.js";

const router = express.Router();
router.use(authenticateToken as any);

const networkSchema = z.enum([
  "facebook",
  "instagram",
  "linkedin",
  "pinterest",
  "tiktok",
  "youtube",
  "threads",
  "twitter",
  "gmb",
  "meta_ads",
]);

const distributionQuerySchema = z.object({
  metric: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  timezone: z.string().optional(),
  subject: z.string().optional(),
  scope: z.string().optional(),
  blogId: z.string().optional(),
});

const timelineQuerySchema = z.object({
  metric: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  timezone: z.string().optional(),
  subject: z.string().optional(),
  blogId: z.string().optional(),
});

const postsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  subject: z.string().optional(),
  blogId: z.string().optional(),
});

const competitorsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  timezone: z.string().optional(),
  limit: z.coerce.number().optional(),
  blogId: z.string().optional(),
});

const connectedNetworksQuerySchema = z.object({
  blogId: z.string().optional(),
});

router.get("/brands", async (_req, res, next) => {
  try {
    const data = await listBrands();
    res.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
    res.json({ success: true, data, error: null });
  } catch (error) {
    next(error);
  }
});

router.get("/connected-networks", async (req, res, next) => {
  try {
    const query = connectedNetworksQuerySchema.parse(req.query);
    const data = await fetchConnectedNetworks(query.blogId);
    res.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
    res.json({ success: true, data, error: null });
  } catch (error) {
    next(error);
  }
});

router.get("/:network/distribution", async (req, res, next) => {
  try {
    const network = networkSchema.parse(req.params.network);
    const query = distributionQuerySchema.parse(req.query);
    const data = await fetchDistribution({
      network,
      ...query,
    });
    res.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
    res.json({ success: true, data, error: null });
  } catch (error) {
    next(error);
  }
});

router.get("/:network/timeline", async (req, res, next) => {
  try {
    const network = networkSchema.parse(req.params.network);
    const query = timelineQuerySchema.parse(req.query);
    const data = await fetchTimeline({
      network,
      ...query,
    });
    res.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
    res.json({ success: true, data, error: null });
  } catch (error) {
    next(error);
  }
});

router.get("/:network/posts", async (req, res, next) => {
  try {
    const network = networkSchema.parse(req.params.network);
    const query = postsQuerySchema.parse(req.query);
    const data = await fetchPosts(network, query);
    res.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
    res.json({ success: true, data, error: null });
  } catch (error) {
    next(error);
  }
});

router.get("/:network/competitors", async (req, res, next) => {
  try {
    const network = networkSchema.parse(req.params.network);
    const query = competitorsQuerySchema.parse(req.query);
    const data = await fetchCompetitors(network, query);
    res.set("Cache-Control", "private, max-age=300, stale-while-revalidate=600");
    res.json({ success: true, data, error: null });
  } catch (error) {
    next(error);
  }
});

export default router;
