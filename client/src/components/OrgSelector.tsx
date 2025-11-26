import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';

interface Organization {
  name: string;
  prefix: string;
}

interface OrgSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  inputRef?: React.RefObject<HTMLInputElement>;
}

const OrgSelector: React.FC<OrgSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = "Search for your organization...",
  className = "",
  inputRef,
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const internalInputRef = useRef<HTMLInputElement>(null);
  const actualInputRef = inputRef || internalInputRef;

  // Fetch organizations on mount
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get('/api/auth/organizations');
        setOrganizations(data);
        setFilteredOrgs(data);
      } catch (err) {
        console.error('Failed to fetch organizations:', err);
        setOrganizations([]);
        setFilteredOrgs([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrganizations();
  }, []);

  // Filter organizations based on input value
  useEffect(() => {
    if (!value.trim()) {
      setFilteredOrgs(organizations);
    } else {
      const searchTerm = value.toLowerCase();
      const filtered = organizations.filter((org) =>
        org.name.toLowerCase().includes(searchTerm)
      );
      setFilteredOrgs(filtered);
    }
    setHighlightedIndex(-1);
  }, [value, organizations]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
    setIsOpen(true);
  }, [onChange]);

  const handleSelectOrg = useCallback((orgName: string) => {
    onChange(orgName);
    setIsOpen(false);
    actualInputRef.current?.blur();
  }, [onChange, actualInputRef]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOrgs.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredOrgs[highlightedIndex]) {
          handleSelectOrg(filteredOrgs[highlightedIndex].name);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, filteredOrgs, highlightedIndex, handleSelectOrg]);

  const handleFocus = useCallback(() => {
    setIsOpen(true);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Input Field */}
      <div className="relative">
        <input
          ref={actualInputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={`form-input flex w-full min-w-0 resize-none overflow-hidden rounded-lg text-slate-900 dark:text-white focus:outline-0 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:border-[#f04129] focus:ring-2 focus:ring-[#f04129]/20 h-12 lg:h-14 placeholder:text-slate-400 dark:placeholder:text-slate-500 px-4 pr-10 text-base font-normal leading-normal disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        />
        {/* Dropdown Icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <svg className="animate-spin h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <span 
              className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
              style={{ fontSize: '20px' }}
            >
              expand_more
            </span>
          )}
        </div>
      </div>

      {/* Dropdown List */}
      {isOpen && !disabled && (
        <ul
          ref={listRef}
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-lg"
          role="listbox"
        >
          {isLoading ? (
            <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
              Loading organizations...
            </li>
          ) : filteredOrgs.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
              {value.trim() ? 'No organizations found' : 'No organizations available'}
            </li>
          ) : (
            filteredOrgs.map((org, index) => (
              <li
                key={org.prefix}
                role="option"
                aria-selected={highlightedIndex === index}
                onClick={() => handleSelectOrg(org.name)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-4 py-3 text-sm cursor-pointer transition-colors ${
                  highlightedIndex === index
                    ? 'bg-[#f04129]/10 text-[#f04129]'
                    : 'text-slate-900 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                } ${value === org.name ? 'font-semibold' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '18px' }}>
                    business
                  </span>
                  <span>{org.name}</span>
                  {value === org.name && (
                    <span className="material-symbols-outlined ml-auto text-[#f04129]" style={{ fontSize: '18px' }}>
                      check
                    </span>
                  )}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};

export default OrgSelector;

