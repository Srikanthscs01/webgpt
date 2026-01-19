import { useState, useEffect } from 'react';
import { ChatWindow } from './components/ChatWindow';
import { ChatButton } from './components/ChatButton';
import { WidgetTheme, WidgetPublicConfig } from './types';

interface WidgetProps {
  siteKey: string;
  apiUrl: string;
}

const DEFAULT_THEME: WidgetTheme = {
  primaryColor: '#3B82F6',
  backgroundColor: '#FFFFFF',
  textColor: '#1F2937',
  borderRadius: 12,
  position: 'bottom-right',
  offsetX: 20,
  offsetY: 20,
};

export function Widget({ siteKey, apiUrl }: WidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<WidgetPublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [_error, _setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch(`${apiUrl}/widget/config?siteKey=${siteKey}`);
        if (!res.ok) {
          // Use demo config if site not found
          console.warn('Site not found, using demo configuration');
          setConfig({
            siteKey: siteKey,
            theme: DEFAULT_THEME,
            greeting: 'Hi! How can I help you today?',
            placeholder: 'Ask me anything...',
            brandName: 'WebGPT Demo',
          });
          setLoading(false);
          return;
        }
        const data = await res.json();
        setConfig(data.data);
      } catch (err) {
        // Use demo config on error
        console.warn('Error loading config, using demo configuration:', err);
        setConfig({
          siteKey: siteKey,
          theme: DEFAULT_THEME,
          greeting: 'Hi! How can I help you today?',
          placeholder: 'Ask me anything...',
          brandName: 'WebGPT Demo',
        });
      } finally {
        setLoading(false);
      }
    }

    loadConfig();
  }, [siteKey, apiUrl]);

  if (loading) {
    return null;
  }

  if (!config) {
    return null;
  }

  const theme = { ...DEFAULT_THEME, ...config.theme };

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 9999,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    ...(theme.position === 'bottom-right'
      ? { right: theme.offsetX, bottom: theme.offsetY }
      : { left: theme.offsetX, bottom: theme.offsetY }),
  };

  return (
    <div style={containerStyle}>
      {isOpen && (
        <ChatWindow
          siteKey={siteKey}
          apiUrl={apiUrl}
          config={config}
          theme={theme}
          onClose={() => setIsOpen(false)}
        />
      )}
      <ChatButton
        isOpen={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        theme={theme}
      />
    </div>
  );
}



