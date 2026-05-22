import React from 'react';

const Header = () => {
  return (
    <header style={{ 
      display: 'flex', 
      alignItems: 'center', 
      padding: '0 20px',
      height: '85px', 
      background: 'linear-gradient(90deg, #000000 0%, #003366 40%)',
      color: '#ffffff',           
      boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
      zIndex: 2000 
    }}>
    </header>
  );
};

export default Header;