import React, { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div style={styles.container}>
      <div style={styles.mainContent}>
        {children}
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
    fontFamily: "'Roboto', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },

  mainContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '40px 20px',
  },
};

export default MainLayout;