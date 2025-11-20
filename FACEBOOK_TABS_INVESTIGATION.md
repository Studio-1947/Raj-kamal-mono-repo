# Facebook Tabs Data Investigation & Fix

## Summary

I've investigated why the Facebook tabs (Reels, Stories, Competitors, Demographics) were showing "Coming Soon" or empty data, and implemented fixes to fetch actual data from the Metricool API.

## Issues Found

### 1. **Reels, Stories, and Competitors Tabs - "Coming Soon" Placeholders**
   - **Problem**: These sections were hardcoded with placeholder content (lines 588-605 in `FacebookView.tsx`)
   - **Root Cause**: No API functions existed to fetch data for these content types
   - **Solution**: Created dedicated API functions and UI components to display actual data

### 2. **Demographics Data Empty**
   - **Problem**: Demographics sections showing no data
   - **Root Cause**: Metricool API limitations:
     - Demographics distribution timelines are NOT supported by Metricool
     - Age/Gender demographics were deprecated by Facebook in September 2024
     - Only location-based (country/city) demographics available as current snapshots (not historical)
     - Requires minimum 100 followers for demographic data
   - **Solution**: Added informative messages explaining these limitations

### 3. **Missing Subject Parameter**
   - **Problem**: Metricool API requires a `subject` parameter to differentiate between posts, reels, stories, and competitors
   - **Solution**: Implemented `fetchFacebookSection()` function that properly sets the subject parameter

## Changes Made

### 1. Frontend API Service (`frontend/src/services/metricoolApi.ts`)

Added new functions to fetch Facebook-specific section data:

```typescript
// New Facebook section-specific data fetchers
export type FacebookSection = "posts" | "reels" | "stories" | "competitors";

export async function fetchFacebookSection(
  section: FacebookSection,
  params?: Record<string, unknown>
)

export async function fetchFacebookReels(params?: Record<string, unknown>)
export async function fetchFacebookStories(params?: Record<string, unknown>)
export async function fetchFacebookCompetitors(params?: Record<string, unknown>)
```

These functions:
- Call the Metricool API with the appropriate `subject` parameter
- Fetch both timeline data and individual items
- Handle errors gracefully with informative messages

### 2. Facebook View Component (`frontend/src/components/FacebookView.tsx`)

**Added State Variables:**
```typescript
const [reelsData, setReelsData] = useState<any>(null);
const [storiesData, setStoriesData] = useState<any>(null);
const [competitorsData, setCompetitorsData] = useState<any>(null);
```

**Updated Data Fetching:**
- Added API calls for Reels, Stories, and Competitors in the `useEffect` hook
- All data is fetched in parallel using `Promise.all()`

**Replaced Placeholder UI:**
- **Reels Section**: Displays table of reels with metrics (impressions, reach, likes, comments, shares)
- **Stories Section**: Displays table of stories with metrics
- **Competitors Section**: Displays comparison table (followers, posts, engagement)
- All sections include error handling and informative messages when data is unavailable

**Improved Demographics Messages:**
- Added explanation about 100 followers requirement
- Noted Facebook's deprecation of age/gender demographics

## What Data is Available from Metricool

### ✅ Available Metrics

1. **Page Overview**
   - Followers, Likes, Views, Page Visits
   - Growth trends (impressions, reach, followers)
   - Follower balance (acquired vs lost)

2. **Posts**
   - Individual post metrics
   - Impressions, reach, engagement
   - Comments, shares, likes

3. **Clicks on Page**
   - Timeline of page clicks

4. **Reels** (with `subject=reels`)
   - Individual reel metrics
   - Performance data

5. **Stories** (with `subject=stories`)
   - Individual story metrics
   - Performance data

6. **Competitors** (with `subject=competitors`)
   - Competitor comparison data
   - Requires setup in Metricool dashboard

### ⚠️ Limited/Unavailable Metrics

1. **Demographics**
   - ❌ Historical timelines NOT available
   - ❌ Age/Gender demographics deprecated by Facebook (Sept 2024)
   - ✅ Location (country/city) available as current snapshot only
   - ⚠️ Requires minimum 100 followers

## API Endpoints Used

All data is fetched through these backend endpoints:

- `GET /metricool/facebook/timeline` - Time-series data for metrics
- `GET /metricool/facebook/distribution` - Distribution data (demographics)
- `GET /metricool/facebook/posts` - Posts/content items

### Required Parameters:

- `metric`: The metric to fetch (e.g., "impressions", "reach", "followers")
- `subject`: Content type ("account", "posts", "reels", "stories", "competitors")
- `from`: Start date (ISO format)
- `to`: End date (ISO format)
- `timezone`: Timezone (default: "Asia/Kolkata")

## Testing Recommendations

1. **Check Browser Console**: Look for API errors or warnings
2. **Verify Metricool Setup**: 
   - Ensure Facebook page is connected in Metricool
   - Check if Reels/Stories permissions are granted
   - Add competitors in Metricool dashboard for competitor data
3. **Check Follower Count**: Demographics require 100+ followers
4. **Review API Responses**: Check the console logs for actual data structure

## Expected Behavior

### When Data is Available:
- Tables display with actual metrics
- Charts show trends over time
- All sections are interactive and functional

### When Data is Unavailable:
- Informative messages explain why (permissions, setup, API limitations)
- No "Coming Soon" placeholders
- Clear guidance on what's needed to get data

## Next Steps

If you're still seeing empty data:

1. **Check Backend Logs**: Look for API errors from Metricool
2. **Verify API Credentials**: Ensure `METRICOOL_API_TOKEN`, `METRICOOL_USER_ID`, `METRICOOL_BLOG_ID` are set
3. **Test API Directly**: Use Postman to test Metricool endpoints
4. **Check Metricool Dashboard**: Verify data exists in the actual Metricool platform
5. **Review Permissions**: Ensure all Facebook permissions are granted in Metricool

## Files Modified

1. `frontend/src/services/metricoolApi.ts` - Added Facebook section fetchers
2. `frontend/src/components/FacebookView.tsx` - Implemented UI for Reels, Stories, Competitors
3. Created this documentation file

---

**Date**: 2025-11-20
**Status**: ✅ Implementation Complete
