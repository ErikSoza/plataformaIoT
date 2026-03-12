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
    <div style={styles.tabNavigation}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          style={tab.active ? styles.tabActive : styles.tab}
          onClick={() => handleTabClick(tab.id)}
        >
          {tab.label}
        </div>
      ))}
    </div>
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
    backgroundColor: '#00BCD4',
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '600' as const,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    borderBottom: '3px solid #00BCD4',
    position: 'relative' as const,
    transition: 'all 0.3s ease',
    flex: '0 0 auto',
    whiteSpace: 'nowrap' as const,
  },

  tab: {
    padding: '15px 20px',
    backgroundColor: 'transparent',
    color: '#666',
    fontSize: '0.9rem',
    fontWeight: '500' as const,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s ease',
    flex: '0 0 auto',
    whiteSpace: 'nowrap' as const,
  },
};

export default TabNavigation;