import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/layout/Sidebar';
import { WaiterCallBanner } from './components/common/WaiterCallBanner';

// Səhifələr
import { LoginPage } from './pages/auth/LoginPage';
import { POSPage } from './pages/pos/POSPage';
import { KitchenPage } from './pages/kitchen/KitchenPage';
import { TablesPage } from './pages/tables/TablesPage';
import { WaiterPage } from './pages/waiter/WaiterPage';
import { MenuPage } from './pages/menu/MenuPage';
import { InventoryPage } from './pages/inventory/InventoryPage';
import { ReportsPage } from './pages/reports/ReportsPage';
import { StaffPage } from './pages/staff/StaffPage';
import { QRMenuPage } from './pages/qr-menu/QRMenuPage';

// Qorunan Marşrut Qoruyucusu
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <Sidebar />
      <WaiterCallBanner />
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <BrowserRouter>
            <Routes>
              {/* Müştəri QR Menyu (Açıq Marşrut) */}
              <Route path="/order/:token" element={<QRMenuPage />} />

              {/* Giriş Səhifəsi */}
              <Route path="/login" element={<LoginPage />} />

              {/* İdarəetmə Paneli Marşrutları (Qorunan) */}
              <Route
                path="/pos"
                element={
                  <ProtectedLayout>
                    <POSPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/kitchen"
                element={
                  <ProtectedLayout>
                    <KitchenPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/tables"
                element={
                  <ProtectedLayout>
                    <TablesPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/waiter"
                element={
                  <ProtectedLayout>
                    <WaiterPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/menu"
                element={
                  <ProtectedLayout>
                    <MenuPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/inventory"
                element={
                  <ProtectedLayout>
                    <InventoryPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/reports"
                element={
                  <ProtectedLayout>
                    <ReportsPage />
                  </ProtectedLayout>
                }
              />
              <Route
                path="/staff"
                element={
                  <ProtectedLayout>
                    <StaffPage />
                  </ProtectedLayout>
                }
              />

              {/* Başlanğıc Yönləndirməsi */}
              <Route path="/" element={<Navigate to="/pos" replace />} />
              <Route path="*" element={<Navigate to="/pos" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
