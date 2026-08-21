'use client';

/**
 * Official Google Identity Services (GSI) & OAuth 2.0 Integration Module
 */
export function triggerGoogleOAuthPopup(
  onSuccess: (token: string, userInfo?: { email: string; name: string; picture: string }) => void,
  onError?: (error: string) => void
) {
  if (typeof window === 'undefined') return;

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // If no custom Google Client ID is configured in environment, fallback immediately to in-app Google OAuth Modal
  if (!clientId || clientId.includes('demo') || clientId.includes('flocksocial')) {
    if (onError) {
      onError('GOOGLE_CLIENT_ID_NOT_CONFIGURED');
    }
    return;
  }

  // 1. If Google GSI SDK is loaded on page (window.google.accounts.id)
  if ((window as any).google?.accounts?.id) {
    try {
      (window as any).google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: any) => {
          if (response.credential) {
            onSuccess(response.credential);
          } else if (onError) {
            onError('No Google credential returned');
          }
        },
      });

      (window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          openGooglePopupWindow(clientId, onSuccess, onError);
        }
      });
      return;
    } catch (e) {
      // Fallback to popup window
    }
  }

  // 2. Open Official Google OAuth Account Selector Popup Window
  openGooglePopupWindow(clientId, onSuccess, onError);
}

function openGooglePopupWindow(
  clientId: string,
  onSuccess: (token: string, userInfo?: any) => void,
  onError?: (error: string) => void
) {
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
