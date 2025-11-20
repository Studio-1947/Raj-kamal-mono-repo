import express from 'express';
import { z } from 'zod';
import {
  fetchDistribution,
  fetchTimeline,
  fetchPosts,
  fetchCompetitors,
} from '../services/metricoolService.js';

const router = express.Router();

const networkSchema = z.enum([
  'facebook',
  'instagram',
  'linkedin',
  'pinterest',
  'tiktok',
  'youtube',
  'threads',
  'twitter',
  'gmb',
]);

const distributionQuerySchema = z.object({
  metric: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  timezone: z.string().optional(),
  subject: z.string().optional(),
  scope: z.string().optional(),
});

const timelineQuerySchema = z.object({
  metric: z.string(),
  from: z.string().optional(),
  to: z.string().optional(),
  timezone: z.string().optional(),
  subject: z.string().optional(),
});

const postsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().optional(),
  pageSize: z.coerce.number().optional(),
  subject: z.string().optional(),
});

const competitorsQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  timezone: z.string().optional(),
  limit: z.coerce.number().optional(),
});

router.get('/:network/distribution', async (req, res, next) => {
  try {
    const network = networkSchema.parse(req.params.network);
    const query = distributionQuerySchema.parse(req.query);
    const data = await fetchDistribution({
      network,
      ...query,
    });
    res.json({ success: true, data, error: null });
  } catch (error) {
    next(error);
  }
});

router.get('/:network/timeline', async (req, res, next) => {
  try {
    const network = networkSchema.parse(req.params.network);
    const query = timelineQuerySchema.parse(req.query);
    const data = await fetchTimeline({
      network,
      ...query,
    });
    res.json({ success: true, data, error: null });
  } catch (error) {
    next(error);
  }
});

router.get('/:network/posts', async (req, res, next) => {
  try {
    const network = networkSchema.parse(req.params.network);
    const query = postsQuerySchema.parse(req.query);
    const data = await fetchPosts(network, query);
    res.json({ success: true, data, error: null });
  } catch (error) {
    next(error);
  }
});

router.get('/:network/competitors', async (req, res, next) => {
  try {
    const network = networkSchema.parse(req.params.network);
    const query = competitorsQuerySchema.parse(req.query);
    const data = await fetchCompetitors(network, query);
    res.json({ success: true, data, error: null });
  } catch (error) {
    next(error);
  }
});

export default router;
