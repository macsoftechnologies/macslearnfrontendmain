import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import './ActionMenu.css';

/**
 * Kebab dropdown action menu with smart auto-positioning.
 */
export default function ActionMenu({ items = [] }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [coords, setCoords] = useState({ top: 0, right: 0 });
  const menuRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    
    const handleScroll = (e) => {
      // Close dropdown if scrolling happens to prevent detachment
      if (open) setOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open]);

  const toggleOpen = (e) => {
    e.stopPropagation();
    if (!open && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const isUp = spaceBelow < 220;
      setDropUp(isUp);
      setCoords({
        right: window.innerWidth - rect.right,
        top: isUp ? rect.top - 8 : rect.bottom + 8
      });
    }
    setOpen(prev => !prev);
  };

  const renderDropdown = () => {
    return (
      <div 
        ref={dropdownRef}
        className={`action-menu__dropdown ${dropUp ? 'action-menu__dropdown--up' : ''}`}
        style={{ position: 'fixed', top: dropUp ? 'auto' : coords.top, bottom: dropUp ? (window.innerHeight - coords.top - 16) : 'auto', right: coords.right, zIndex: 999999 }}
      >
        {items.map((item, i) => {
          if (item.separator) {
            return <div key={`sep-${i}`} className="action-menu__separator" />;
          }

          const Icon = item.icon;
          const className = `action-menu__item ${item.danger ? 'action-menu__item--danger' : ''}`;

          if (item.to) {
            return (
              <Link key={i} to={item.to} className={className} onClick={(e) => { e.stopPropagation(); setOpen(false); }}>
                {Icon && <Icon size={15} />}
                {item.label}
              </Link>
            );
          }

          return (
            <button key={i} className={className} onClick={(e) => { e.stopPropagation(); setOpen(false); item.onClick?.(); }}>
              {Icon && <Icon size={15} />}
              {item.label}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="action-menu" ref={menuRef}>
      <button className={`action-menu__trigger ${open ? 'action-menu__trigger--active' : ''}`} onClick={toggleOpen} aria-label="Actions">
        <MoreVertical size={16} />
      </button>
      {open && createPortal(renderDropdown(), document.body)}
    </div>
  );
}

