import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  active?: boolean;
}

interface TabNavigationProps {
  tabs: TabItem[];
  onTabChange?: (tabId: string) => void;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ tabs, onTabChange }) => {
  const handleTabClick = (tabId: string) => {
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  return (
    <nav aria-label="Navegación principal" style={styles.tabNavigation}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          aria-current={tab.active ? 'page' : undefined}
          style={tab.active ? styles.tabActive : styles.tab}
          onClick={() => handleTabClick(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

const styles = {
  tabNavigation: {
    background: '#ffffff',
    borderBottom: '3px solid #00BCD4',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    width: 'fit-content',
    margin: '0 auto',
    position: 'sticky' as const,
    top: 0,
    zIndex: 9997,
    justifyContent: 'center',
  },

  tabActive: {
    padding: '15px 20px',
    backgroundColor: '#007E8A',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '600' as const,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    border: 'none' as const,
    borderBottom: '3px solid #00BCD4',
    fontFamily: 'inherit',
    position: 'relative' as const,
    transition: 'all 0.3s ease',
    flex: '0 0 auto',
    whiteSpace: 'nowrap' as const,
  },

  tab: {
    padding: '15px 20px',
    backgroundColor: 'transparent',
    color: '#444444',
    fontSize: '0.9rem',
    fontWeight: '500' as const,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    border: 'none' as const,
    borderBottom: '3px solid transparent',
    fontFamily: 'inherit',
    transition: 'all 0.3s ease',
    flex: '0 0 auto',
    whiteSpace: 'nowrap' as const,
  },
};

export default TabNavigation;