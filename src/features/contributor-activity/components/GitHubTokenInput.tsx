import { useState, useEffect, useCallback } from 'react';

const TOKEN_KEY = 'github_token';

interface GitHubTokenInputProps {
  onTokenChange: (token: string) => void;
}

export const GitHubTokenInput: React.FC<GitHubTokenInputProps> = ({ onTokenChange }) => {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken) {
      onTokenChange(savedToken);
    }
  }, [onTokenChange]);

  const handleSave = useCallback(() => {
    if (token.trim()) {
      localStorage.setItem(TOKEN_KEY, token.trim());
      onTokenChange(token.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [token, onTokenChange]);

  const handleClear = useCallback(() => {
    setToken('');
    localStorage.removeItem(TOKEN_KEY);
    onTokenChange('');
  }, [onTokenChange]);

  return (
    <div className="github-token-input">
      <div className="token-field">
        <label>GitHub Token (optional - for higher rate limits):</label>
        <div className="token-input-row">
          <input
            type={showToken ? 'text' : 'password'}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          />
          <button 
            type="button" 
            onClick={() => setShowToken(!showToken)}
            className="toggle-visibility"
          >
            {showToken ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>
      <div className="token-actions">
        <button onClick={handleSave} className="btn-save">
          {saved ? 'Saved!' : 'Save Token'}
        </button>
        {token && (
          <button onClick={handleClear} className="btn-clear">
            Clear
          </button>
        )}
      </div>
      <p className="token-help">
        Get a token at: Settings → Developer settings → Personal access tokens
      </p>
    </div>
  );
};
