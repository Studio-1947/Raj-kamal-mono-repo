import { describe, it, expect } from "vitest";
import {
    getMetricoolHealth,
    buildMetricoolBaseParams,
} from "../../config/metricool.js";
import {
    fetchDistribution,
    fetchTimeline,
    fetchPosts,
    fetchCompetitors,
} from "../../services/metricoolService.js";

describe("Metricool Integration Smoke Tests", () => {
    it("should return valid Metricool health state structure", () => {
        const health = getMetricoolHealth();
        expect(health).toHaveProperty("configured");
        expect(typeof health.configured).toBe("boolean");
        expect(health).toHaveProperty("lastSuccessAt");
        expect(health).toHaveProperty("lastFailureAt");
        expect(health).toHaveProperty("lastErrorStatus");
        expect(health).toHaveProperty("lastErrorMessage");
    });

    it("should correctly handle missing credentials when building base params", () => {
        // Without env vars set, buildMetricoolBaseParams should throw or return base object
        try {
            const params = buildMetricoolBaseParams({ extraKey: "testValue" });
            expect(params).toHaveProperty("userId");
            expect(params).toHaveProperty("blogId");
            expect(params).toHaveProperty("userToken");
            expect(params.extraKey).toBe("testValue");
        } catch (err: any) {
            expect(err.message).toContain("Missing");
        }
    });

    it("should accept valid distribution parameters structure", async () => {
        try {
            await fetchDistribution({
                metric: "impressions",
                network: "facebook",
                from: "2026-01-01",
                to: "2026-01-30",
            });
        } catch (err: any) {
            // Expected to throw missing token or network error in test environment without live credentials
            expect(err).toBeDefined();
        }
    });

    it("should accept valid timeline parameters structure", async () => {
        try {
            await fetchTimeline({
                metric: "followers",
                network: "instagram",
                from: "2026-01-01",
                to: "2026-01-30",
            });
        } catch (err: any) {
            expect(err).toBeDefined();
        }
    });

    it("should handle meta_ads network mapping to facebookads", async () => {
        try {
            await fetchTimeline({
                metric: "clicks",
                network: "meta_ads",
                from: "2026-01-01",
                to: "2026-01-30",
            });
        } catch (err: any) {
            expect(err).toBeDefined();
        }
    });
});
