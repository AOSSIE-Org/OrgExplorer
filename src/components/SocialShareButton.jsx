import React, { useRef, useEffect } from 'react';

const DEFAULT_HASHTAGS = [];
const DEFAULT_PLATFORMS = ['whatsapp', 'facebook', 'twitter', 'linkedin', 'telegram', 'reddit', 'pinterest'];
const DEFAULT_ANALYTICS_PLUGINS = [];

const SocialShareButton = ({
  url = '',
  title = '',
  description = '',
  hashtags = DEFAULT_HASHTAGS,
  via = '',
  platforms = DEFAULT_PLATFORMS,
  theme = 'dark',
  buttonText = 'Share',
  customClass = '',
  onShare = null,
  buttonStyle = 'default',
  modalPosition = 'center',
  buttonColor = '',
  buttonHoverColor = '',
  showButton = true,
  analytics = true,
  onAnalytics = null,
  analyticsPlugins = DEFAULT_ANALYTICS_PLUGINS,
  componentId = null,
  debug = false,
}) => {
  const containerRef = useRef(null);
  const shareButtonRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.SocialShareButton) {
      shareButtonRef.current = new window.SocialShareButton({
        container: containerRef.current,
        url: url || 'https://orgexplorer.aossie.org/',
        title: title || document.title,
        description,
        hashtags,
        via,
        platforms,
        theme,
        buttonText,
        customClass,
        onShare,
        buttonStyle,
        modalPosition,
        buttonColor,
        buttonHoverColor,
        showButton,
        analytics,
        onAnalytics,
        analyticsPlugins,
        componentId,
        debug,
      });
    } else {
      console.warn('SocialShareButton widget not loaded');
    }
    return () => {
      if (shareButtonRef.current) {
        shareButtonRef.current.destroy();
        shareButtonRef.current = null;
      }
    };
  }, [
    url, title, description, hashtags, via, platforms, theme, buttonText,
    customClass, onShare, buttonStyle, modalPosition, buttonColor,
    buttonHoverColor, showButton, analytics, onAnalytics, analyticsPlugins,
    componentId, debug,
  ]);

  return <div ref={containerRef}></div>;
};

export default SocialShareButton;
