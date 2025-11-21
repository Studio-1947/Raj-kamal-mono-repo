# Font Size Enhancement for Accessibility

## Overview
Enhanced font sizes across the entire frontend application to improve readability for older users while maintaining visual hierarchy and aesthetics.

## Changes Made

### 1. Tailwind Configuration (`tailwind.config.ts`)
Extended the theme with larger font sizes across all size classes:

| Size Class | Before | After | Increase |
|------------|--------|-------|----------|
| `text-xs` | 12px | 14px | +2px (16.7%) |
| `text-sm` | 14px | 16px | +2px (14.3%) |
| `text-base` | 16px | 18px | +2px (12.5%) |
| `text-lg` | 18px | 20px | +2px (11.1%) |
| `text-xl` | 20px | 24px | +4px (20%) |
| `text-2xl` | 24px | 28px | +4px (16.7%) |
| `text-3xl` | 30px | 32px | +2px (6.7%) |
| `text-4xl` | 36px | 40px | +4px (11.1%) |

**Line Heights:** Also improved line heights for better readability:
- Smaller text (xs-lg): 1.5-1.75
- Medium text (xl-2xl): 1.75-2
- Large text (3xl-4xl): 2.25-2.5

### 2. Base Styles (`index.css`)
- Set base HTML font size to **16px** (browser default, ensuring consistency)
- Improved body line height to **1.6** for better text flow and readability

## Impact

### Affected Components
All components using Tailwind text utilities will automatically benefit from these changes:

#### Navigation & Layout
- **Sidebar**: Menu items, labels, user account info
- **AppLayout**: Main content area
- **NavBar**: Navigation links and buttons

#### Views
- **Dashboard**: Metrics cards, chart labels, table data
- **Social**: Facebook/Instagram analytics, metrics, tables
- **Login**: Form labels, input text, error messages
- **Home**: Welcome messages, dashboard cards
- **Inventory**: Product listings, stock information
- **Rankings**: Ranking tables, statistics
- **Settings**: Configuration options

#### Components
- **FacebookView**: All tabs, metrics, tables, charts
- **InstagramView**: Section tabs, data tables, analytics
- **GenericSalesWidget**: Sales charts, metrics
- **OnlineSalesList**: Transaction tables
- **Tables**: All data tables throughout the app
- **Forms**: Input fields, labels, validation messages
- **Buttons**: All button text
- **Cards**: Metric cards, info cards

### Visual Hierarchy Maintained
The relative size differences between elements are preserved:
- Headings remain proportionally larger than body text
- Small labels (xs) are still smaller than regular text (sm/base)
- Large titles (2xl-4xl) maintain their prominence

### Accessibility Benefits
1. **Improved Readability**: Larger text is easier to read for users with visual impairments
2. **Better Contrast**: Increased line height reduces visual crowding
3. **Reduced Eye Strain**: More comfortable reading experience for extended use
4. **Professional Appearance**: Changes are subtle enough to maintain the modern, clean aesthetic

## Testing Recommendations

### Manual Testing
1. **Dashboard View**: Check that metrics cards are readable without feeling cramped
2. **Tables**: Verify that data tables (sales, social media) are easy to scan
3. **Forms**: Ensure input labels and error messages are clear
4. **Charts**: Confirm that chart labels and tooltips are legible
5. **Mobile View**: Test on smaller screens to ensure text doesn't overflow

### Specific Areas to Review
- [ ] Sidebar navigation items
- [ ] Dashboard metric cards
- [ ] Social media analytics tables
- [ ] Sales data tables
- [ ] Login form
- [ ] Chart labels and legends
- [ ] Button text
- [ ] Error messages
- [ ] Dropdown menus

## Rollback Instructions
If needed, the changes can be easily reverted:

1. **Tailwind Config**: Remove the `fontSize` object from the `extend` section
2. **Index.css**: Remove the `font-size: 16px;` and `line-height: 1.6;` declarations

## Notes
- Changes are CSS-only and don't affect functionality
- No JavaScript or component logic was modified
- All existing Tailwind classes work exactly as before, just with larger sizes
- The Switzer font family remains unchanged
- Responsive breakpoints and other Tailwind utilities are unaffected

## Future Considerations
- Consider adding a user preference toggle for font size in Settings
- Monitor user feedback for further adjustments
- Consider WCAG 2.1 Level AA compliance for text sizing (minimum 14px for body text - now exceeded)
