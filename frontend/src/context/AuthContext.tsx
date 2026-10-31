import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'SUPER_ADMIN' | 'RESTAURANT_ADMIN' | 'CASHIER' | 'WAITER' | 'KITCHEN_STAFF' | 'STOCK_MANAGER';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  hasRole: () => false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('rms_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('rms_token');
      if (savedToken) {
        try {
          const res: any = await api.get('/auth/me');
          if (res.success && res.user) {
            setUser(res.user);
          } else {
            logout();
          }
        } catch (e) {
          logout();
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('rms_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('rms_token');
    setToken(null);
    setUser(null);
  };

  const hasRole = (...roles: string[]) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        hasRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
