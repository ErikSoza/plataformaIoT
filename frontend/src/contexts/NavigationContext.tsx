import React, { createContext, useContext, useState, ReactNode } from 'react';

type Page = 'home' | 'login' | 'register';

interface NavigationContextType {
  currentPage: Page;
  navigateTo: (page: Page) => void;
  // Tab navigation para Home.tsx
  pendingTab: string | null;
  pendingSection: string | null;
  navigateToTab: (tab: string, section?: string) => void;
  clearPending: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [pendingTab, setPendingTab] = useState<string | null>(null);
  const [pendingSection, setPendingSection] = useState<string | null>(null);

  const navigateTo = (page: Page) => setCurrentPage(page);

  const navigateToTab = (tab: string, section?: string) => {
    setPendingTab(tab);
    setPendingSection(section ?? null);
  };

  const clearPending = () => {
    setPendingTab(null);
    setPendingSection(null);
  };

  return (
    <NavigationContext.Provider value={{ currentPage, navigateTo, pendingTab, pendingSection, navigateToTab, clearPending }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (!context) throw new Error('useNavigation debe usarse dentro de NavigationProvider');
  return context;
};
