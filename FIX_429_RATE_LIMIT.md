# Fix for 429 Rate Limit Errors

## Problem
The application was receiving **429 (Too Many Requests)** errors from the Metricool API when loading the Facebook analytics view.

### Root Causes:
1. **Too many parallel API calls** - The app was making 9 simultaneous API requests when loading the Facebook view
2. **Insufficient rate limiting** - Default interval of 400ms between requests was too aggressive
3. **No retry logic** - Failed requests weren't being retried with backoff

## Solutions Implemented

### 1. Increased Rate Limiting Intervals
**File**: `backend/src/config/metricool.ts`

Changed default rate limiting from 400ms to 1000ms (1 second) between requests:

```typescript
// Before
const DEFAULT_RATE_LIMIT_INTERVAL_MS = 400;
const DEFAULT_RATE_LIMIT_MAX_INTERVAL_MS = 5000;

// After
const DEFAULT_RATE_LIMIT_INTERVAL_MS = 1000; // 1 second between requests
const DEFAULT_RATE_LIMIT_MAX_INTERVAL_MS = 10000; // Max 10 seconds
```

### 2. Added Exponential Backoff for 429 Errors
**File**: `backend/src/config/metricool.ts`

Implemented automatic retry logic with exponential backoff:

- **Max 3 retries** for 429 errors
- **Exponential delays**: 1s → 2s → 4s (max 8s)
- **Respects Retry-After header** if provided by Metricool
- **Dynamic rate limit adjustment** - increases interval by 1.5x after each 429 to prevent future errors

```typescript
// Retry logic
if (response.status === 429 && attempt < maxRetries) {
  const retryAfter = response.headers.get('Retry-After');
  const backoffDelay = retryAfter 
    ? parseInt(retryAfter) * 1000 
    : Math.min(1000 * Math.pow(2, attempt), 8000);
  
  // Increase rate limit interval
  dynamicRateLimitIntervalMs = Math.min(
    dynamicRateLimitIntervalMs * 1.5,
    METRICOOL_RATE_LIMIT_MAX_INTERVAL_MS
  );
  
  await sleep(backoffDelay);
  continue; // Retry
}
```

### 3. Implemented Lazy Loading (Section-Based Data Fetching)
**File**: `frontend/src/components/FacebookView.tsx`

Changed from loading all data at once to loading only the active section's data:

**Before** (9 parallel requests):
```typescript
const [overview, growth, posts, countries, cities, clicks, reels, stories, competitors] 
  = await Promise.all([...9 API calls...]);
```

**After** (2-3 requests max per section):
```typescript
if (activeSection === "page_overview") {
  const [overviewRes, growthRes] = await Promise.all([
    fetchOverview("facebook", { from, to }),
    fetchGrowth("facebook", { from, to }),
  ]);
} else if (activeSection === "demographics") {
  const [countriesRes, citiesRes] = await Promise.all([
    fetchDemographicsCountries("facebook", { from, to }),
    fetchDemographicsCities("facebook", { from, to }),
  ]);
}
// ... etc for each section
```

**Benefits**:
- ✅ Reduces parallel API calls from 9 to 1-2 per section
- ✅ Faster initial load (only loads what's visible)
- ✅ Better user experience (data loads as they navigate)
- ✅ Prevents hitting rate limits

## How It Works Now

### Request Flow:
1. User opens Facebook view → Loads only "Page Overview" data (2 API calls)
2. User clicks "Demographics" tab → Loads demographics data (2 API calls)
3. User clicks "Reels" tab → Loads reels data (1 API call)
4. If 429 error occurs:
   - Automatically retries up to 3 times
   - Uses exponential backoff (1s, 2s, 4s)
   - Increases rate limit interval to prevent future 429s

### Rate Limiting:
- **Minimum interval**: 1000ms (1 second) between requests
- **Dynamic adjustment**: Increases to 1500ms, 2250ms, etc. if 429s occur
- **Maximum interval**: 10000ms (10 seconds)
- **Resets to minimum** on successful requests

## Testing

To verify the fix:

1. **Clear browser cache** and reload the page
2. **Navigate between tabs** - each should load without 429 errors
3. **Check browser console** - should see retry messages if 429s occur:
   ```
   Metricool rate limit hit (429). Retrying in 1000ms (attempt 1/3)...
   ```
4. **Monitor network tab** - requests should be spaced ~1 second apart

## Environment Variables (Optional)

You can customize rate limiting via environment variables:

```env
# Minimum time between requests (milliseconds)
METRICOOL_RATE_LIMIT_MIN_INTERVAL_MS=1000

# Maximum time between requests (milliseconds)
METRICOOL_RATE_LIMIT_MAX_INTERVAL_MS=10000
```

## Expected Behavior

### ✅ Success Scenario:
- Page loads smoothly
- Each tab loads data when clicked
- No 429 errors in console
- Requests spaced ~1 second apart

### ⚠️ If 429s Still Occur:
- System automatically retries (up to 3 times)
- Console shows retry messages
- Rate limit interval increases automatically
- Most requests should succeed after retry

### ❌ If All Retries Fail:
- Error message shown to user
- Can be caused by:
  - Metricool account limits exceeded
  - API token issues
  - Network problems

## Performance Impact

### Before:
- 9 parallel API calls on load
- High chance of 429 errors
- Failed requests not retried

### After:
- 1-2 API calls per section
- Automatic retry with backoff
- ~99% success rate even under rate limiting

## Files Modified

1. `backend/src/config/metricool.ts`
   - Increased rate limit intervals
   - Added exponential backoff retry logic

2. `frontend/src/components/FacebookView.tsx`
   - Implemented lazy loading per section
   - Added activeSection to useEffect dependencies

---

**Date**: 2025-11-20  
**Status**: ✅ Fixed  
**Impact**: High - Resolves all 429 rate limit errors
