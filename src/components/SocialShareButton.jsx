import React, { useRef, useEffect, useState } from 'react';
import { FiShare2 } from 'react-icons/fi';

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
  onCopy = null,
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
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (window.SocialShareButton) {
        setLoadError(false);
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
      } else {
        setLoadError(true);
      }
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

  if (loadError) {
    const handleFallbackCopy = async () => {
      try {
        if (onCopy) {
          await onCopy();
        } else {
          const fallbackUrl = url || 'https://orgexplorer.aossie.org/';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(fallbackUrl);
          } else {
            throw new Error("Clipboard API not available");
          }
        }
        alert("Widget failed to load. Link copied to clipboard!");
      } catch (err) {
        console.error("Failed to copy link: ", err);
        alert("Widget failed to load. Failed to copy link.");
      }
    };

    return (
      <button
        type="button"
        onClick={handleFallbackCopy}
        style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, border: '1px solid #ef4444', padding: '6px 12px', borderRadius: '6px', background: 'transparent', color: 'inherit', cursor: 'pointer' }}
        title="Social Share widget failed to load. Click to copy link."
      >
        <FiShare2 size={13} /> {buttonText} (Fallback)
      </button>
    );
  }

  return <div ref={containerRef}></div>;
};

export default SocialShareButton;
