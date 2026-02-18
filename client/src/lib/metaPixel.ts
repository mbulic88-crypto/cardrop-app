declare global {
  interface Window {
    fbq: (...args: any[]) => void;
  }
}

function fbq(...args: any[]) {
  if (typeof window !== 'undefined' && window.fbq) {
    window.fbq(...args);
  }
}

export function trackPageView(url?: string) {
  fbq('track', 'PageView', url ? { page_path: url } : undefined);
}

export function trackViewContent(params: {
  content_name: string;
  content_category?: string;
  content_type?: string;
  value?: number;
  currency?: string;
}) {
  fbq('track', 'ViewContent', params);
}

export function trackContact(params?: {
  content_name?: string;
  content_category?: string;
}) {
  fbq('track', 'Contact', params);
}

export function trackCompleteRegistration(params?: {
  content_name?: string;
  status?: boolean;
}) {
  fbq('track', 'CompleteRegistration', params || { status: true });
}
