import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState('');
  const [user, setUser] = useState(null); // { login, avatar, role, section }

  function login(ghToken, userInfo) {
    setToken(ghToken);
    setUser(userInfo);
  }

  function logout() {
    setToken('');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, isAuthed: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
