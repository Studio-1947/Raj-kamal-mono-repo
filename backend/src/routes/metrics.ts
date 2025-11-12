import { Router, Response } from "express";
import { authenticateToken, AuthRequest } from "../middleware/authPrisma.js";

const router = Router();

/**
 * GET /brand-summary/posts
 * Proxy to Metricool brand-summary posts endpoint.
 * Query params:
 *  - from (required) ISO datetime
 *  - to (required) ISO datetime
 *  - timezone (optional) e.g. 'Asia/Calcutta'
 *  - userId (optional)
 *  - blogId (optional)
 */
router.get(
  "/brand-summary/posts",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const from = String(req.query.from || "");
      const to = String(req.query.to || "");
      const timezone = req.query.timezone
        ? String(req.query.timezone)
        : undefined;
      const userId = req.query.userId ? String(req.query.userId) : undefined;
      const blogId = req.query.blogId ? String(req.query.blogId) : undefined;

      if (!from || Number.isNaN(Date.parse(from))) {
        res
          .status(400)
          .json({
            success: false,
            error:
              "Invalid or missing 'from' query param. Use ISO datetime string.",
          });
        return;
      }
      if (!to || Number.isNaN(Date.parse(to))) {
        res
          .status(400)
          .json({
            success: false,
            error:
              "Invalid or missing 'to' query param. Use ISO datetime string.",
          });
        return;
      }

      const base =
        "https://app.metricool.com/api/v2/analytics/brand-summary/posts";
      const params = new URLSearchParams();
      params.set("from", from);
      params.set("to", to);
      if (timezone) params.set("timezone", timezone);
      if (userId) params.set("userId", userId);
      if (blogId) params.set("blogId", blogId);

      const url = `${base}?${params.toString()}`;

      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (process.env.METRICOOL_API_KEY) {
        headers["X-Mc-Auth"] = process.env.METRICOOL_API_KEY;
      }

      const resp = await fetch(url, { method: "GET", headers });

      if (!resp.ok) {
        const text = await resp.text();
        res
          .status(502)
          .json({
            success: false,
            error: "Metricool upstream error",
            status: resp.status,
            body: text,
          });
        return;
      }

      const data = await resp.json();
      res.json({ success: true, data });
    } catch (error: any) {
      console.error("Error in /api/metrics/brand-summary/posts", error);
      res
        .status(500)
        .json({ success: false, error: error?.message || String(error) });
    }
  }
);

export default router;
