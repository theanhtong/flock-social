'use client';

import { toast } from 'sonner';

/**
 * Official Google Identity Services (GSI) & OAuth 2.0 Popup Window Handler
 * (STRICT PRODUCTION MODE - NO MOCK DATA)
 */
export function triggerGoogleOAuthPopup(
  onSuccess: (token: string, userInfo?: { email: string; name: string; picture: string }) => void,
  onError?: (error: string) => void
) {
  if (typeof window === 'undefined') return;

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // STRICT REQUIREMENT: If NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured in .env.local, refuse to execute & inform user
  if (!clientId || clientId.trim() === '' || clientId.includes('demo') || clientId.includes('flocksocial')) {
    toast.error(
      'Chưa cấu hình NEXT_PUBLIC_GOOGLE_CLIENT_ID trong apps/web/.env.local. Vui lòng thêm Google OAuth Client ID từ Google Cloud Console để mở popup Google thật!',
      { duration: 5000 }
    );
    if (onError) onError('MISSING_GOOGLE_CLIENT_ID');
    return;
  }

  // Open Official Google OAuth Account Selector Popup Window directly with Google's servers
  const width = 500;
  const height = 620;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const redirectUri = window.location.origin;
  const googleAuthUrl =
    `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=token%20id_token` +
    `&scope=${encodeURIComponent('openid email profile')}` +
    `&prompt=select_account`;

  const popup = window.open(
    googleAuthUrl,
    'GoogleSignWithModal',
    `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=yes`
  );

  if (!popup) {
    toast.error('Trình duyệt đã chặn cửa sổ Popup Google. Vui lòng cho phép Popups!');
    if (onError) onError('Popup blocked by browser');
    return;
  }

  const timer = setInterval(() => {
    try {
      if (!popup || popup.closed) {
        clearInterval(timer);
        return;
      }

      if (popup.location.href.includes(redirectUri)) {
        const hash = popup.location.hash;
        const params = new URLSearchParams(hash.replace('#', '?'));
        const idToken = params.get('id_token') || params.get('access_token');

        popup.close();
        clearInterval(timer);

        if (idToken) {
          onSuccess(idToken);
        } else if (onError) {
          onError('OAUTH_CANCELLED');
        }
      }
    } catch (e) {
      // Cross-origin check while popup navigates on google.com
    }
  }, 300);
}
