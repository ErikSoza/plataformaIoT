import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { alertaService, AlertaEvento } from '../services/api';
import { useAuth } from './AuthContext';

interface AlertContextValue {
  alertas: AlertaEvento[];
  noLeidas: number;
  toastsNuevos: AlertaEvento[];
  loading: boolean;
  marcarLeida: (id: number) => Promise<void>;
  marcarTodasLeidas: () => Promise<void>;
  dismissToast: (id: number) => void;
  recargar: () => Promise<void>;
}

const AlertContext = createContext<AlertContextValue | null>(null);

export const useAlerts = (): AlertContextValue => {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error('useAlerts debe usarse dentro de AlertProvider');
  return ctx;
};

const POLL_INTERVAL_MS = 60_000;

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [alertas, setAlertas] = useState<AlertaEvento[]>([]);
  const [toastsNuevos, setToastsNuevos] = useState<AlertaEvento[]>([]);
  const [loading, setLoading] = useState(false);
  const lastCheckRef = useRef<number>(0);

  const userId = user?.id;

  const recargar = useCallback(async () => {
    if (!isAuthenticated || !userId) return;
    try {
      const data = await alertaService.getAlertas(false, userId);
      setAlertas(data);
    } catch {
      // silencioso
    }
  }, [isAuthenticated, userId]);

  const verificarYMostrar = useCallback(async () => {
    if (!isAuthenticated || !userId) return;
    try {
      const { alertas: nuevas } = await alertaService.verificar(userId);
      if (nuevas.length > 0) {
        setToastsNuevos((prev) => [...prev, ...nuevas]);
        setAlertas((prev) => [...nuevas, ...prev]);
      }
    } catch {
      // silencioso
    }
    lastCheckRef.current = Date.now();
  }, [isAuthenticated, userId]);

  // Limpiar estado al cerrar sesión
  useEffect(() => {
    if (!isAuthenticated) {
      setAlertas([]);
      setToastsNuevos([]);
    }
  }, [isAuthenticated]);

  // Carga inicial cuando el usuario está autenticado
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    setLoading(true);
    recargar().finally(() => setLoading(false));
    verificarYMostrar();
  }, [isAuthenticated, userId, recargar, verificarYMostrar]);

  // Polling
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    const id = setInterval(verificarYMostrar, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isAuthenticated, userId, verificarYMostrar]);

  const marcarLeida = useCallback(async (id: number) => {
    await alertaService.marcarLeida(id);
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, leida: 1 } : a)));
  }, []);

  const marcarTodasLeidas = useCallback(async () => {
    await alertaService.marcarTodasLeidas(userId);
    setAlertas((prev) => prev.map((a) => ({ ...a, leida: 1 })));
  }, [userId]);

  const dismissToast = useCallback((id: number) => {
    setToastsNuevos((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const noLeidas = alertas.filter((a) => a.leida === 0).length;

  return (
    <AlertContext.Provider
      value={{ alertas, noLeidas, toastsNuevos, loading, marcarLeida, marcarTodasLeidas, dismissToast, recargar }}
    >
      {children}
    </AlertContext.Provider>
  );
};
