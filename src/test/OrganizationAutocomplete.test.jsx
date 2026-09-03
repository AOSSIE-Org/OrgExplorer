import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import OrganizationAutocomplete from '../components/OrganizationAutocomplete';
import * as githubService from '../services/github';
import * as appContext from '../context/AppContext';

// Mock dependencies
vi.mock('../services/github', () => ({
  searchOrganizations: vi.fn(),
}));

vi.mock('../context/AppContext', () => ({
  useApp: vi.fn(),
}));

describe('OrganizationAutocomplete', () => {
  const mockOnSelectOrg = vi.fn();
  const mockOnChange = vi.fn();
  const mockOnKeyDown = vi.fn();
  const mockOnBlur = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    appContext.useApp.mockReturnValue({ pat: 'fake-token' });
    githubService.searchOrganizations.mockResolvedValue([
      { id: 1, login: 'reactjs', avatar_url: 'img1.png' },
      { id: 2, login: 'react', avatar_url: 'img2.png' },
      { id: 3, login: 'react', avatar_url: 'img2.png' } // duplicate
    ]);
  });

  const renderComponent = (props = {}) => {
    return render(
      <OrganizationAutocomplete
        value={props.value ?? ''}
        onChange={props.onChange ?? mockOnChange}
        onKeyDown={props.onKeyDown ?? mockOnKeyDown}
        onBlur={props.onBlur ?? mockOnBlur}
        onSelectOrg={props.onSelectOrg ?? mockOnSelectOrg}
        placeholder="Search orgs..."
      />
    );
  };

  it('renders input correctly', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('Search orgs...')).toBeInTheDocument();
  });

  it('does not call API immediately (debounce)', async () => {
    const { rerender } = renderComponent({ value: '' });
    expect(githubService.searchOrganizations).not.toHaveBeenCalled();
    
    // Simulate typing
    rerender(<OrganizationAutocomplete value="debounce" onChange={mockOnChange} />);
    
    expect(githubService.searchOrganizations).not.toHaveBeenCalled();
    
    await waitFor(() => {
      expect(githubService.searchOrganizations).toHaveBeenCalledTimes(1);
    });
    
    expect(githubService.searchOrganizations).toHaveBeenCalledWith('debounce', 'fake-token', expect.any(AbortSignal));
  });

  it('does not trigger for less than 2 characters', async () => {
    const { rerender } = renderComponent({ value: '' });
    
    rerender(<OrganizationAutocomplete value="r" onChange={mockOnChange} />);
    
    // Wait for the debounce time to pass to ensure it is not called
    await new Promise(r => setTimeout(r, 600));
    
    expect(githubService.searchOrganizations).not.toHaveBeenCalled();
  });

  it('shows loading state then results (deduplicated)', async () => {
    const { rerender } = renderComponent({ value: '' });
    
    rerender(<OrganizationAutocomplete value="react" onChange={mockOnChange} />);
    
    await waitFor(() => {
      expect(screen.getByText('reactjs')).toBeInTheDocument();
    });
    
    expect(screen.getAllByText('react').length).toBe(1);
  });

  it('supports keyboard navigation', async () => {
    const { rerender } = renderComponent({ value: '' });
    
    rerender(
      <OrganizationAutocomplete
        value="keyboard"
        onChange={mockOnChange}
        onKeyDown={mockOnKeyDown}
        onSelectOrg={mockOnSelectOrg}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('reactjs')).toBeInTheDocument();
    });

    const input = screen.getByRole('combobox');
    
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox').children[0]).toHaveAttribute('aria-selected', 'true');
    
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox').children[1]).toHaveAttribute('aria-selected', 'true');
    
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(screen.getByRole('listbox').children[0]).toHaveAttribute('aria-selected', 'true');
    
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockOnSelectOrg).toHaveBeenCalledWith('reactjs');
  });

  it('calls onSelectOrg when a suggestion is clicked', async () => {
    const { rerender } = renderComponent({ value: '' });
    
    rerender(
      <OrganizationAutocomplete
        value="select"
        onChange={mockOnChange}
        onSelectOrg={mockOnSelectOrg}
      />
    );
    
    await waitFor(() => {
      expect(screen.getByText('reactjs')).toBeInTheDocument();
    });

    const option = screen.getByText('reactjs');
    fireEvent.mouseDown(option);
    
    expect(mockOnSelectOrg).toHaveBeenCalledWith('reactjs');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('handles stale requests correctly via AbortController', async () => {
    let resolveSecond;
    
    githubService.searchOrganizations
      .mockImplementationOnce((query, pat, signal) => {
        return new Promise((resolve, reject) => {
          signal.addEventListener('abort', () => {
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
      })
      .mockImplementationOnce((query, pat, signal) => {
        return new Promise(resolve => {
          resolveSecond = resolve;
        });
      });

    const { rerender } = renderComponent({ value: '' });
    
    rerender(<OrganizationAutocomplete value="stale1" onChange={mockOnChange} />);
    
    // Wait for first debounce
    await waitFor(() => {
      expect(githubService.searchOrganizations).toHaveBeenCalledTimes(1);
    });
    
    rerender(<OrganizationAutocomplete value="stale2" onChange={mockOnChange} />);
    
    // Wait for second debounce
    await waitFor(() => {
      expect(githubService.searchOrganizations).toHaveBeenCalledTimes(2);
    });
    
    // Resolve second request
    resolveSecond([{ id: 4, login: 'react-native', avatar_url: 'img4.png' }]);
    
    await waitFor(() => {
      expect(screen.getByText('react-native')).toBeInTheDocument();
    });
  });

  it('handles empty state', async () => {
    githubService.searchOrganizations.mockResolvedValueOnce([]);
    
    const { rerender } = renderComponent({ value: '' });
    
    rerender(<OrganizationAutocomplete value="empty" onChange={mockOnChange} />);
    
    await waitFor(() => {
      expect(screen.getByText('No organizations found')).toBeInTheDocument();
    });
  });

  it('closes dropdown on Escape', async () => {
    const { rerender } = renderComponent({ value: '' });
    
    rerender(<OrganizationAutocomplete value="escape" onChange={mockOnChange} />);
    
    await waitFor(() => {
      expect(screen.getByText('reactjs')).toBeInTheDocument();
    });

    const input = screen.getByRole('combobox');
    fireEvent.keyDown(input, { key: 'Escape' });
    
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes dropdown on outside click', async () => {
    const { rerender } = renderComponent({ value: '' });
    
    rerender(<OrganizationAutocomplete value="outside" onChange={mockOnChange} />);
    
    await waitFor(() => {
      expect(screen.getByText('reactjs')).toBeInTheDocument();
    });

    fireEvent.mouseDown(document.body);
    
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not call API if query is cached', async () => {
    const { rerender } = renderComponent({ value: '' });
    
    rerender(<OrganizationAutocomplete value="cache_test" onChange={mockOnChange} />);
    
    await waitFor(() => {
      expect(githubService.searchOrganizations).toHaveBeenCalledTimes(1);
    });
    
    // Clear input
    rerender(<OrganizationAutocomplete value="" onChange={mockOnChange} />);
    await new Promise(r => setTimeout(r, 600));
    
    // Search same query again
    rerender(<OrganizationAutocomplete value="cache_test" onChange={mockOnChange} />);
    
    await waitFor(() => {
      // It should still be 1, because the second time it hit the cache
      expect(githubService.searchOrganizations).toHaveBeenCalledTimes(1);
      expect(screen.getByText('reactjs')).toBeInTheDocument();
    });
  });

  it('limits results to maximum 8 suggestions', async () => {
    const manyResults = Array.from({ length: 15 }, (_, i) => ({
      id: i, login: `org${i}`, avatar_url: `img${i}.png`
    }));
    githubService.searchOrganizations.mockResolvedValueOnce(manyResults);
    
    const { rerender } = renderComponent({ value: '' });
    rerender(<OrganizationAutocomplete value="limit_test" onChange={mockOnChange} />);
    
    await waitFor(() => {
      expect(screen.getByText('org0')).toBeInTheDocument();
    });
    
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(8);
  });

  it('clears suggestions when input is cleared', async () => {
    const { rerender } = renderComponent({ value: '' });
    
    rerender(<OrganizationAutocomplete value="clear_test" onChange={mockOnChange} />);
    
    await waitFor(() => {
      expect(screen.getByText('reactjs')).toBeInTheDocument();
    });
    
    rerender(<OrganizationAutocomplete value="" onChange={mockOnChange} />);
    
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    
    // Verify it doesn't trigger API again
    await new Promise(r => setTimeout(r, 600));
    expect(githubService.searchOrganizations).toHaveBeenCalledTimes(1);
  });

  it('handles API errors gracefully', async () => {
    githubService.searchOrganizations.mockRejectedValueOnce(new Error('API Rate Limit'));
    
    const { rerender } = renderComponent({ value: '' });
    rerender(<OrganizationAutocomplete value="error_test" onChange={mockOnChange} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load suggestions')).toBeInTheDocument();
    });
  });
});
