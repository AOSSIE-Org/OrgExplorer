import React, { useRef, useEffect } from 'react';

const SocialShareButton = ({
  url = '',
  title = '',
  description = '',
  hashtags = [],
  via = '',
  platforms = ['whatsapp', 'facebook', 'twitter', 'linkedin', 'telegram', 'reddit', 'pinterest'],
  theme = 'dark',
  buttonText = 'Share',
  customClass = '',
  onShare = null,
  onCopy = null,
  buttonStyle = 'default',
  modalPosition = 'center',
  buttonColor = '',
  buttonHoverColor = '',
  showButton = true,
  analytics = true,
  onAnalytics = null,
  analyticsPlugins = [],
  componentId = null,
  debug = false,
}) => {
  const containerRef = useRef(null);
  const shareButtonRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.SocialShareButton) {
      shareButtonRef.current = new window.SocialShareButton({
        container: containerRef.current,
        url: url || window.location.href,
        title: title || document.title,
        description,
        hashtags,
        via,
        platforms,
        theme,
        buttonText,
        customClass,
        onShare,
        onCopy,
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
    }

    return () => {
      if (shareButtonRef.current) {
        shareButtonRef.current.destroy();
        shareButtonRef.current = null;
      }
    };
  }, [
    url, title, description, hashtags, via, platforms, theme, buttonText,
    customClass, onShare, onCopy, buttonStyle, modalPosition, buttonColor,
    buttonHoverColor, showButton, analytics, onAnalytics, analyticsPlugins,
    componentId, debug
  ]);

  return <div ref={containerRef}></div>;
};

export default SocialShareButton;
