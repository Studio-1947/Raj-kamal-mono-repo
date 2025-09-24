import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import { query } from '../config/database.js';

const router = express.Router();

// Helper function to get social media data from database
const getSocialMediaData = async () => {
  const socialQuery = `
    SELECT 
      platform,
      metric_name,
      metric_value,
      metric_date
    FROM social_media_metrics 
    WHERE metric_date = (SELECT MAX(metric_date) FROM social_media_metrics)
    ORDER BY platform, metric_name
  `;
  
  const result = await query(socialQuery);
  const metrics = result.rows;
  
  // Transform flat data into nested structure
  const platforms: any = {};
  
  metrics.forEach(metric => {
    if (!platforms[metric.platform]) {
      platforms[metric.platform] = {};
    }
    
    const key = metric.metric_name.replace('_rate', '').replace('_growth', 'Growth');
    let value = parseInt(metric.metric_value);
    
    // Convert stored values back to proper decimals for rates
    if (metric.metric_name.includes('_rate')) {
      value = value / 10;
    }
    
    platforms[metric.platform][key] = value;
  });
  
  return platforms;
};

// Get social media overview
router.get('/overview', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const platforms = await getSocialMediaData();
    
    // Calculate summary metrics
    const totalFollowers = Object.values(platforms).reduce((sum: number, platform: any) => {
      return sum + (platform.followers || platform.subscribers || 0);
    }, 0);
    
    const totalGrowth = Object.values(platforms).reduce((sum: number, platform: any) => {
      return sum + (platform.followersGrowth || platform.subscribersGrowth || 0);
    }, 0);
    
    const avgEngagement = Object.values(platforms).reduce((sum: number, platform: any) => {
      return sum + (platform.engagement || 0);
    }, 0) / Object.keys(platforms).length;

    const summary = {
      totalFollowers,
      totalGrowth,
      avgEngagement: parseFloat(avgEngagement.toFixed(1)),
      totalPosts: Object.values(platforms).reduce((sum: number, platform: any) => {
        return sum + (platform.posts || platform.videos || platform.tweets || 0);
      }, 0),
      topPerformingPlatform: 'facebook',
      monthlyReach: 580000,
      reachGrowth: 18.5,
    };
    
    res.json({
      success: true,
      data: {
        summary,
        platforms,
        topContent: [], // Mock for now
        activeCampaigns: [], // Mock for now
      }
    });
  } catch (error) {
    console.error('Social media overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching social media data'
    });
  }
});

// Get platform-specific data
router.get('/platform/:platform', authenticateToken, async (req: AuthRequest, res: Response) => {
  const { platform } = req.params;
  
  try {
    const platforms = await getSocialMediaData();
    
    if (!platforms[platform]) {
      return res.status(404).json({
        success: false,
        message: 'Platform not found'
      });
    }
    
    res.json({
      success: true,
      data: platforms[platform]
    });
  } catch (error) {
    console.error('Platform-specific data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching platform data'
    });
  }
});

// Get campaigns
router.get('/campaigns', authenticateToken, (req: AuthRequest, res: Response) => {
  const { status } = req.query;
  
  let filteredCampaigns = []; // Mock for now
  if (status) {
    filteredCampaigns = filteredCampaigns.filter(c => c.status === status);
  }
  
  res.json({
    success: true,
    data: filteredCampaigns
  });
});

// Get influencer data
router.get('/influencers', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: [] // Mock for now
  });
});

// Get content analytics
router.get('/content', authenticateToken, (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: {} // Mock for now
  });
});

// Get engagement analytics
router.get('/engagement', authenticateToken, (req: AuthRequest, res: Response) => {
  const engagementData = {
    daily: [], // Mock for now
    byPlatform: {}, // Mock for now
  };
  
  res.json({
    success: true,
    data: engagementData
  });
});

// Get social media summary for dashboard
router.get('/summary', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const platforms = await getSocialMediaData();
    
    const totalFollowers = Object.values(platforms).reduce((sum: number, platform: any) => {
      return sum + (platform.followers || platform.subscribers || 0);
    }, 0);
    
    const totalGrowth = Object.values(platforms).reduce((sum: number, platform: any) => {
      return sum + (platform.followersGrowth || platform.subscribersGrowth || 0);
    }, 0);
    
    const avgEngagement = Object.values(platforms).reduce((sum: number, platform: any) => {
      return sum + (platform.engagement || 0);
    }, 0) / Object.keys(platforms).length;

    res.json({
      success: true,
      data: {
        totalFollowers,
        totalGrowth,
        avgEngagement: parseFloat(avgEngagement.toFixed(1)),
        totalPosts: Object.values(platforms).reduce((sum: number, platform: any) => {
          return sum + (platform.posts || platform.videos || platform.tweets || 0);
        }, 0),
        topPerformingPlatform: 'facebook',
        monthlyReach: 580000,
        reachGrowth: 18.5,
      }
    });
  } catch (error) {
    console.error('Social media summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching social media summary'
    });
  }
});

export default router;