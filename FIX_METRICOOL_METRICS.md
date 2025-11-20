# Fix for Metricool API Metric Errors

## Problem
The application was receiving **400 Bad Request** errors from the Metricool API with messages like:

```
InvalidEnumBaseException: Invalid field 'impressions'. 
Valid values are: [count]
```

This occurred when fetching data for **Reels**, **Stories**, and **Competitors** sections.

## Root Cause

Different content types (subjects) in the Metricool API support different metrics:

| Subject | Supported Metrics |
|---------|-------------------|
| **Posts** | `impressions`, `reach`, `engagement`, etc. |
| **Reels** | `count`, `blue_reels_play_count`, `post_impressions_unique`, etc. |
| **Stories** | `count`, `post_impressions_unique`, `post_video_avg_time_watched`, etc. |
| **Competitors** | `count` only |

Our code was incorrectly using `impressions` for all subjects, which caused 400 errors for Reels, Stories, and Competitors.

## Solution

Updated both Facebook and Instagram section fetchers to use the correct metric for each subject type.

### Changes Made

**File**: `frontend/src/services/metricoolApi.ts`

#### 1. Facebook Sections (`fetchFacebookSection`)

Added a metric mapping:

```typescript
const metricMap: Record<FacebookSection, string> = {
  posts: "impressions",      // Posts support impressions
  reels: "count",            // Reels use count
  stories: "count",          // Stories use count
  competitors: "count",      // Competitors use count
};
```

Also skipped timeline fetching for competitors (not supported):

```typescript
if (section !== "competitors") {
  // Only fetch timeline for non-competitor sections
  timelineData = await getMetricool<any>("/metricool/facebook/timeline", {
    metric,
    subject,
    ...
  });
}
```

#### 2. Instagram Sections (`fetchInstagramSection`)

Applied the same fix:

```typescript
const metricMap: Record<InstagramSection, string> = {
  community: "impressions",
  account: "impressions",
  posts: "impressions",
  reels: "count",
  stories: "count",
  competitors: "count",
};
```

## Impact

### Before:
- ❌ 400 errors for Reels, Stories, Competitors
- ❌ No data displayed in these sections
- ❌ Error messages in console

### After:
- ✅ Correct metrics used for each section
- ✅ Data loads successfully
- ✅ No 400 errors
- ✅ Timeline skipped for competitors (not supported)

## API Behavior by Section

### Facebook/Instagram Posts
- **Metric**: `impressions`
- **Timeline**: ✅ Supported
- **Posts List**: ✅ Supported

### Facebook/Instagram Reels
- **Metric**: `count`
- **Timeline**: ✅ Supported
- **Posts List**: ✅ Supported
- **Note**: Can also use `blue_reels_play_count`, `post_impressions_unique`, etc.

### Facebook/Instagram Stories
- **Metric**: `count`
- **Timeline**: ✅ Supported
- **Posts List**: ✅ Supported
- **Note**: Can also use `post_impressions_unique`, `post_video_avg_time_watched`, etc.

### Facebook/Instagram Competitors
- **Metric**: `count`
- **Timeline**: ❌ Not supported (skipped)
- **Posts List**: ✅ Supported

## Testing

After this fix, you should see:

1. **No more 400 errors** for Reels, Stories, Competitors
2. **Data loading successfully** in all sections
3. **Console logs** showing successful data fetch:
   ```
   Facebook Reels Data Loaded: {...}
   Facebook Stories Data Loaded: {...}
   Facebook Competitors Data Loaded: {...}
   ```

## Future Enhancements

If you want to use more specific metrics for Reels/Stories:

### For Reels:
```typescript
reels: "blue_reels_play_count"  // Video plays
// or
reels: "post_impressions_unique" // Unique impressions
```

### For Stories:
```typescript
stories: "post_video_avg_time_watched" // Average watch time
// or
stories: "post_impressions_unique" // Unique impressions
```

These can be configured in the `metricMap` objects in `metricoolApi.ts`.

## Related Fixes

This fix works in conjunction with:
- **429 Rate Limit Fix** - Prevents too many requests
- **Lazy Loading** - Loads data per section
- **Exponential Backoff** - Retries failed requests

Together, these ensure a smooth, error-free experience when fetching Metricool data.

---

**Date**: 2025-11-20  
**Status**: ✅ Fixed  
**Files Modified**: `frontend/src/services/metricoolApi.ts`
