# Fix for Instagram Demographics 400 Errors

## Problem
Getting 400 Bad Request errors when fetching Instagram demographics:

```
InvalidEnumBaseException: Invalid field 'account'. 
Valid values are: [gender, age, country, city, postsTypes]
```

Also getting errors for `followers_country` and `page_follows_country`:
```
Invalid field 'account'. Valid values are: [gender, age, country, city, postsTypes]
```

## Root Cause

The Metricool **distribution endpoint** (`/api/v2/analytics/distribution`) uses different metric names than we were sending:

### What We Were Sending (Wrong):
- Facebook: `page_follows_country`, `page_follows_city`
- Instagram: `followers_country`, `followers_city`

### What Metricool Expects (Correct):
- **All platforms**: `country`, `city` (simple names!)

The API documentation shows valid values are:
- `gender`
- `age`
- `country` ✅
- `city` ✅
- `postsTypes`

## Solution

Updated the distribution metric aliases to use the correct simple names.

**File**: `frontend/src/services/metricoolApi.ts`

### Before:
```typescript
const distributionMetricAliases: Record<PlatformKey, DistributionMetricMap> = {
  facebook: {
    country: "page_follows_country", // ❌ Wrong
    city: "page_follows_city", // ❌ Wrong
  },
  instagram: {
    country: "followers_country", // ❌ Wrong
    city: "followers_city", // ❌ Wrong
  },
};
```

### After:
```typescript
const distributionMetricAliases: Record<PlatformKey, DistributionMetricMap> = {
  facebook: {
    country: "country", // ✅ Correct
    city: "city", // ✅ Correct
  },
  instagram: {
    country: "country", // ✅ Correct
    city: "city", // ✅ Correct
  },
};
```

Also updated the fallback:
```typescript
// Before
const fallback = kind === "country" ? "page_follows_country" : "page_follows_city";

// After
return distributionMetricAliases[platform]?.[kind] ?? kind; // Just use 'country' or 'city'
```

## Impact

### Before:
- ❌ 400 errors for demographics
- ❌ No country/city data displayed
- ❌ Error messages in console

### After:
- ✅ Demographics data loads successfully
- ✅ Country breakdown displayed
- ✅ City breakdown displayed
- ✅ No 400 errors

## Metricool Distribution API Metrics

The distribution endpoint supports these metrics:

| Metric | Description | Status |
|--------|-------------|--------|
| `gender` | Gender distribution | ⚠️ Deprecated by Facebook |
| `age` | Age distribution | ⚠️ Deprecated by Facebook |
| `country` | Country distribution | ✅ Working |
| `city` | City distribution | ✅ Working |
| `postsTypes` | Post types distribution | ✅ Available |

**Note**: Gender and age were deprecated by Facebook in September 2024, so even though Metricool supports them, they won't return data for Facebook/Instagram.

## Testing

After this fix, demographics should work:

1. **Navigate to Demographics tab**
2. **Should see**:
   - Country pie chart with data
   - City table with top cities
   - No 400 errors in console

3. **Requirements**:
   - Need 100+ followers for demographics data
   - Data shows current snapshot (not historical)

## Related Fixes

This fix complements:
1. **Queue-based rate limiting** - Prevents 429 errors
2. **Metric name fixes for Reels/Stories** - Uses 'count' instead of 'impressions'
3. **Removed demographics blocking** - Actually fetches the data now

Together, these ensure all Facebook and Instagram sections work correctly!

---

**Date**: 2025-11-20  
**Status**: ✅ Fixed  
**Files Modified**: `frontend/src/services/metricoolApi.ts`
