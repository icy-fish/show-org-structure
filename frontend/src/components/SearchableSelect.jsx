import { useState, useRef, useEffect } from 'react';

export default function SearchableSelect({ options, value, onChange, placeholder = 'Select...', emptyLabel }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );
  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => {
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const select = (val) => {
    onChange(val);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className={`ss-wrap ${open ? 'ss-open' : ''}`} ref={wrapRef}>
      <div
        className="ss-trigger"
        onClick={() => setOpen(o => !o)}
        tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o); }}
      >
        <span className={selected ? 'ss-value' : 'ss-placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="ss-arrow">{open ? '▲' : '▼'}</span>
      </div>
      {open && (
        <div className="ss-dropdown">
          <div className="ss-search-wrap">
            <span className="ss-search-icon">🔍</span>
            <input
              ref={inputRef}
              className="ss-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              onClick={e => e.stopPropagation()}
            />
          </div>
          <ul className="ss-list">
            {emptyLabel !== undefined && (
              <li
                className={`ss-option ss-empty-opt ${!value ? 'ss-selected' : ''}`}
                onClick={() => select('')}
              >
                {emptyLabel}
              </li>
            )}
            {filtered.map(o => (
              <li
                key={o.value}
                className={`ss-option ${String(o.value) === String(value) ? 'ss-selected' : ''}`}
                onClick={() => select(o.value)}
              >
                {o.label}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="ss-no-results">No results for "{search}"</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
