import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/apiClient';

// Types
export interface SocialMediaPlatform {
  followers: number;
  followersGrowth: number;
  views?: number;
  subscribers?: number;
  impressions?: number;
  viewsGrowth: number;
  posts?: number;
  videos?: number;
  tweets?: number;
  engagement: number;
}

export interface SocialMediaSummary {
  totalFollowers: number;
  totalGrowth: number;
  avgEngagement: number;
  totalPosts: number;
  topPerformingPlatform: string;
  monthlyReach: number;
  reachGrowth: number;
}

export interface Campaign {
  id: string;
  name: string;
  platform: string;
  startDate: Date;
  endDate: Date;
  budget: number;
  spent: number;
  reach: number;
  clicks: number;
  conversions: number;
  status: string;
}

export interface SocialMediaResponse {
  success: boolean;
  data: {
    summary: SocialMediaSummary;
    platforms: {
      facebook: SocialMediaPlatform;
      instagram: SocialMediaPlatform;
      youtube: SocialMediaPlatform;
      twitter: SocialMediaPlatform;
    };
    topContent: any[];
    activeCampaigns: Campaign[];
  };
}

// Social Media API functions
const socialApi = {
  getOverview: async (): Promise<SocialMediaResponse> => {
    return apiClient.get('/social/overview');
  },
  getPlatform: async (platform: string): Promise<{ success: boolean; data: SocialMediaPlatform }> => {
    return apiClient.get(`/social/platform/${platform}`);
  },
  getCampaigns: async (status?: string): Promise<{ success: boolean; data: Campaign[] }> => {
    const params = status ? `?status=${status}` : '';
    return apiClient.get(`/social/campaigns${params}`);
  },
  getEngagement: async (): Promise<{ success: boolean; data: any }> => {
    return apiClient.get('/social/engagement');
  },
  getSummary: async (): Promise<{ success: boolean; data: SocialMediaSummary }> => {
    return apiClient.get('/social/summary');
  },
};

// Social Media React Query hooks
export const useSocialOverview = () => {
  return useQuery({
    queryKey: ['social', 'overview'],
    queryFn: socialApi.getOverview,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSocialPlatform = (platform: string) => {
  return useQuery({
    queryKey: ['social', 'platform', platform],
    queryFn: () => socialApi.getPlatform(platform),
    staleTime: 5 * 60 * 1000,
    enabled: !!platform,
  });
};

export const useSocialCampaigns = (status?: string) => {
  return useQuery({
    queryKey: ['social', 'campaigns', status],
    queryFn: () => socialApi.getCampaigns(status),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSocialEngagement = () => {
  return useQuery({
    queryKey: ['social', 'engagement'],
    queryFn: socialApi.getEngagement,
    staleTime: 5 * 60 * 1000,
  });
};

export const useSocialSummary = () => {
  return useQuery({
    queryKey: ['social', 'summary'],
    queryFn: socialApi.getSummary,
    staleTime: 5 * 60 * 1000,
  });
};