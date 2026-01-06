
import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { storage } from '../services/storageService';

export type LoginResult = 'SUCCESS' | 'USER_NOT_FOUND' | 'WRONG_PASSWORD';

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string, allUsers: User[]) => LoginResult;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => storage.get('auth_user', null));

  const login = (username: string, password: string, allUsers: User[]): LoginResult => {
    const userFound = allUsers.find(u => u.username === username);
    
    if (!userFound) {
      return 'USER_NOT_FOUND';
    }
    
    if (userFound.password !== password) {
      return 'WRONG_PASSWORD';
    }

    // Login succesful
    const { password: _, ...userWithoutPassword } = userFound;
    setUser(userWithoutPassword as User);
    storage.set('auth_user', userWithoutPassword);
    return 'SUCCESS';
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
