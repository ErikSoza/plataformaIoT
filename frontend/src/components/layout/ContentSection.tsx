import React, { ReactNode } from 'react';

interface ContentSectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

const ContentSection: React.FC<ContentSectionProps> = ({ title, children, className }) => {
  return (
    <div style={styles.section} className={className}>
      <h2 style={styles.sectionTitle}>{title}</h2>
      {children}
    </div>
  );
};

const styles = {
  section: {
    marginBottom: '50px',
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '30px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
    border: '1px solid #e9ecef',
  },

  sectionTitle: {
    color: '#2c3e50',
    marginBottom: '25px',
    fontSize: '1.6rem',
    fontWeight: '500' as const,
    borderLeft: '4px solid #00BCD4',
    paddingLeft: '15px',
    margin: '0 0 25px 0',
  },
};

export default ContentSection;