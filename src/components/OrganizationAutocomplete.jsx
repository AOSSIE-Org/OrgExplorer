import React, { useState, useEffect, useRef } from 'react';
import useDebounce from '../hooks/useDebounce';
import useClickOutside from '../hooks/useClickOutside';
import { searchOrganizations } from '../services/github';
import { useApp } from '../context/AppContext';
import { Spinner } from './UI';

// We use a small in-memory LRU cache specifically for autocomplete to prevent 
// duplicating API requests during rapid typing and to avoid unnecessarily polluting
// the global IndexedDB cache with partially-typed, short-lived queries.
const cache = new Map();
const MAX_SUGGESTIONS = 8;
const MIN_QUERY_LENGTH = 2;

export default function OrganizationAutocomplete({
  value,
  onChange,
  onKeyDown,
  onBlur,
  onSelectOrg,
  placeholder,
  style
}) {
  const { pat } = useApp();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [error, setError] = useState(false);
  
  const containerRef = useRef(null);
  const abortControllerRef = useRef(null);
  
  const debouncedValue = useDebounce(value, 400);

  useClickOutside(containerRef, () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  });

  // Handle query change directly to hide dropdown and show correct states
  useEffect(() => {
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setIsOpen(false);
      setSuggestions([]);
    }
  }, [value]);

  useEffect(() => {
    const trimmed = debouncedValue.trim();
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    const fetchOrgs = async () => {
      setLoading(true);
      setError(false);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      const controller = new AbortController();
      abortControllerRef.current = controller;

      const cacheKey = trimmed.toLowerCase();
      if (cache.has(cacheKey)) {
        setSuggestions(cache.get(cacheKey));
        setIsOpen(true);
        setLoading(false);
        setHighlightedIndex(-1);
        return;
      }

      try {
        const results = await searchOrganizations(trimmed, pat, controller.signal);
        
        const deduplicated = results.filter((item, index, self) => 
          index === self.findIndex((t) => t.login.toLowerCase() === item.login.toLowerCase())
        ).slice(0, MAX_SUGGESTIONS);
        
        if (cache.size > 100) {
           const firstKey = cache.keys().next().value;
           cache.delete(firstKey);
        }
        cache.set(cacheKey, deduplicated);
        
        setSuggestions(deduplicated);
        setIsOpen(true);
        setHighlightedIndex(-1);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(true);
          setSuggestions([]);
          setIsOpen(true);
        }
      } finally {
        if (abortControllerRef.current === controller) {
          setLoading(false);
        }
      }
    };

    fetchOrgs();
    
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [debouncedValue, pat]);

  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (onKeyDown) onKeyDown(e);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
        e.preventDefault();
        handleSelect(suggestions[highlightedIndex]);
      } else {
        setIsOpen(false);
        if (onKeyDown) onKeyDown(e);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setHighlightedIndex(-1);
    } else {
      if (onKeyDown) onKeyDown(e);
    }
  };

  const handleSelect = (org) => {
    onSelectOrg(org.login);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };
  
  const handleBlur = (e) => {
    if (onBlur) onBlur(e);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: 1, minWidth: 160 }}>
      <input
        value={value}
        onChange={onChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        style={{ ...style, width: '100%', boxSizing: 'border-box' }}
        role="combobox"
        aria-expanded={isOpen}
        aria-controls="organization-suggestions"
        aria-autocomplete="list"
        aria-activedescendant={highlightedIndex >= 0 ? `suggestion-${highlightedIndex}` : undefined}
      />
      
      {isOpen && value.trim().length >= MIN_QUERY_LENGTH && (
        <ul
          id="organization-suggestions"
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '4px 0',
            listStyle: 'none',
            maxHeight: 250,
            overflowY: 'auto',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}
        >
          {loading ? (
            <li style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text2)', fontSize: 13 }}>
              <Spinner size={16} /> Searching...
            </li>
          ) : error ? (
            <li style={{ padding: '8px 12px', color: 'var(--red)', fontSize: 13 }}>
              Failed to load suggestions
            </li>
          ) : suggestions.length === 0 ? (
            <li style={{ padding: '8px 12px', color: 'var(--text2)', fontSize: 13 }}>
              No organizations found
            </li>
          ) : (
            suggestions.map((org, index) => (
              <li
                key={org.id || org.login}
                id={`suggestion-${index}`}
                role="option"
                aria-selected={index === highlightedIndex}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevent blur
                  handleSelect(org);
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
                style={{
                  padding: '6px 12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  background: index === highlightedIndex ? 'var(--surface2)' : 'transparent',
                  color: 'var(--text)',
                  fontSize: 14,
                }}
              >
                <img
                  src={org.avatar_url}
                  alt=""
                  style={{ width: 20, height: 20, borderRadius: 4 }}
                />
                <span style={{ fontWeight: 500 }}>{org.login}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
