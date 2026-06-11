import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { NavigationProvider } from './contexts/NavigationContext';
import ProtectedRoute from './components/ProtectedRoute';
import AlertToast from './components/AlertToast';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
      <AlertProvider>
      <Router>
        <div className="App">
          <AlertToast />
          <Routes>
            {/* Ruta pública - Home maneja su propia autenticación */}
            <Route path="/" element={<Home />} />
            
            {/* Rutas públicas - solo para usuarios NO autenticados */}
            <Route 
              path="/login" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <Login />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/register" 
              element={
                <ProtectedRoute requireAuth={false}>
                  <Register />
                </ProtectedRoute>
              } 
            />
            
            {/* Ruta catch-all - redirigir a home */}
            <Route path="*" element={<Home />} />
          </Routes>
        </div>
      </Router>
      </AlertProvider>
      </NavigationProvider>
    </AuthProvider>
  );
}

export default App;
