import { useCallback } from 'react';

export interface AnalyticsEvent {
  event: string;
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

export const useAnalytics = () => {
  const trackEvent = useCallback((event: AnalyticsEvent) => {
    // Google Analytics 4
    if (typeof gtag !== 'undefined') {
      gtag('event', event.event, {
        event_category: event.category,
        event_label: event.label,
        value: event.value,
        ...event.custom_parameters
      });
    }

    // Custom analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      }).catch(err => console.warn('Analytics tracking failed:', err));
    } else {
      console.log('Analytics Event:', event);
    }
  }, []);

  const trackPageView = useCallback((page: string, title?: string) => {
    if (typeof gtag !== 'undefined') {
      gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: page,
        page_title: title
      });
    }
  }, []);

  const trackUserAction = useCallback((action: string, details?: Record<string, any>) => {
    trackEvent({
      event: 'user_action',
      category: 'engagement',
      action,
      custom_parameters: details
    });
  }, [trackEvent]);

  const trackError = useCallback((error: Error, context?: string) => {
    trackEvent({
      event: 'exception',
      category: 'error',
      action: context || 'unknown',
      label: error.message,
      custom_parameters: {
        stack: error.stack,
        timestamp: new Date().toISOString()
      }
    });
  }, [trackEvent]);

  const trackConversion = useCallback((type: string, value?: number, currency?: string) => {
    trackEvent({
      event: 'conversion',
      category: 'ecommerce',
      action: type,
      value,
      custom_parameters: { currency }
    });
  }, [trackEvent]);

  return {
    trackEvent,
    trackPageView,
    trackUserAction,
    trackError,
    trackConversion
  };
};