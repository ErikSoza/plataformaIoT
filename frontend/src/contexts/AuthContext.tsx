import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authService } from '../services/api';

interface User {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: User) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar si hay una sesión guardada al cargar la aplicación
  useEffect(() => {
    const initializeAuth = () => {
      try {
        const savedToken = localStorage.getItem('auth_token');
        const savedUser = localStorage.getItem('auth_user');

        if (savedToken && savedUser) {
          const parsedUser = JSON.parse(savedUser);
          
          // Verificar que el token no haya expirado (opcional)
          if (isTokenValid(savedToken)) {
            setToken(savedToken);
            setUser(parsedUser);
          } else {
            // Token expirado, limpiar datos
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
          }
        }
      } catch (error) {
        console.error('Error al inicializar autenticación:', error);
        // Si hay error parseando, limpiar localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Función para verificar si el token es válido (básica)
  const isTokenValid = (token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp > currentTime;
    } catch {
      return false;
    }
  };

  // Función de login
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setIsLoading(true);
      
      const response = await authService.login({ email, password });
      
      if (response.success) {
        const { user: userData, token: userToken } = response;
        
        // Guardar en el estado
        setUser(userData);
        setToken(userToken);
        
        // Guardar en localStorage para persistencia
        localStorage.setItem('auth_token', userToken);
        localStorage.setItem('auth_user', JSON.stringify(userData));
        
        console.log('✅ Login exitoso:', userData.nombre);
      } else {
        throw new Error(response.message || 'Error en el login');
      }
    } catch (error) {
      console.error('❌ Error en login:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Función de logout
  const logout = (): void => {
    // Limpiar el estado
    setUser(null);
    setToken(null);
    
    // Limpiar localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    
    console.log('👋 Sesión cerrada');
  };

  // Función para actualizar datos del usuario
  const updateUser = (userData: User): void => {
    setUser(userData);
    localStorage.setItem('auth_user', JSON.stringify(userData));
  };

  // Valores del contexto
  const contextValue: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;