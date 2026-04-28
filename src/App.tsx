import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import type { RootState } from './store';
import { store } from './store';
import { Layout } from './components/layout/Layout';
import { DriverLayout } from './components/layout/DriverLayout';
import { Dashboard } from './pages/Dashboard';
import ErrorBoundary from './components/common/ErrorBoundary';
import { supabase } from './lib/supabase';
import { setAuthUser } from './store';
import { useEffect, useRef, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { lazy, Suspense } from 'react';
import { LoadingScreen } from './components/common/LoadingScreen';

const FleetPage = lazy(() => import('./pages/Fleet').then(m => ({ default: m.FleetPage })));
const DriversPage = lazy(() => import('./pages/Drivers').then(m => ({ default: m.DriversPage })));
const RentalsPage = lazy(() => import('./pages/Rentals').then(m => ({ default: m.RentalsPage })));
const InvoicesPage = lazy(() => import('./pages/Invoices').then(m => ({ default: m.InvoicesPage })));
const TollsPage = lazy(() => import('./pages/Tolls').then(m => ({ default: m.TollsPage })));
const FinancePage = lazy(() => import('./pages/Finance').then(m => ({ default: m.FinancePage })));
const CompliancePage = lazy(() => import('./pages/Compliance').then(m => ({ default: m.CompliancePage })));
const LoginPage = lazy(() => import('./pages/Login').then(m => ({ default: m.LoginPage })));
const OnboardingPage = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.OnboardingPage })));
const DriverOperations = lazy(() => import('./pages/DriverOperations').then(m => ({ default: m.DriverOperations })));
const VehicleSelection = lazy(() => import('./pages/VehicleSelection').then(m => ({ default: m.VehicleSelection })));
const DriverHistory = lazy(() => import('./pages/DriverHistory').then(m => ({ default: m.DriverHistory })));
const DriverPayments = lazy(() => import('./pages/DriverPayments').then(m => ({ default: m.DriverPayments })));
const AddPaymentMethod = lazy(() => import('./pages/AddPaymentMethod').then(m => ({ default: m.AddPaymentMethod })));
const PaymentStatus = lazy(() => import('./pages/PaymentStatus').then(m => ({ default: m.PaymentStatus })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const BusinessSettings = lazy(() => import('./pages/BusinessSettings').then(m => ({ default: m.BusinessSettings })));
const LiveTracking = lazy(() => import('./pages/LiveTracking').then(m => ({ default: m.LiveTracking })));
const SignupPage = lazy(() => import('./pages/Signup').then(m => ({ default: m.SignupPage })));
const BusinessSetup = lazy(() => import('./pages/BusinessSetup').then(m => ({ default: m.BusinessSetup })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function AppRoutes() {
  const { isAuthenticated, user, loading } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const dispatchRef = useRef(dispatch);
  const userRef = useRef(user);

  useEffect(() => {
    dispatchRef.current = dispatch;
  }, [dispatch]);

  useEffect(() => {
    if (user) {
      userRef.current = user;
    }
  }, [user]);

  const updateAuthUser = useCallback((session: any) => {
    if (session?.user) {
      const currentState = store.getState();
      const existingUser = currentState.auth?.user || userRef.current;
      dispatchRef.current(setAuthUser({
        id: session.user.id,
        email: session.user.email || '',
        name: session.user.user_metadata?.full_name,
        role: existingUser?.role || 'DRIVER',
        driverId: session.user.user_metadata?.driverId || existingUser?.driverId,
        businessId: session.user.user_metadata?.businessId || existingUser?.businessId
      }));
    } else {
      dispatchRef.current(setAuthUser(null));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }: any) => {
        updateAuthUser(session);
      })
      .catch((err: any) => {
        console.error('Failed to get Supabase session:', err);
        dispatch(setAuthUser(null));
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      updateAuthUser(session);
    });

    return () => subscription.unsubscribe();
  }, [updateAuthUser]);

  if (loading) {
    return <LoadingScreen message="Checking Authentication..." />;
  }

  return (
    <Suspense fallback={<LoadingScreen message="Loading Application..." />}>
      <Routes>
        <Route path="/" element={
          isAuthenticated ? (
            user?.role === 'ADMIN' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard/operations" replace />
          ) : <LandingPage />
        } />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/setup-business" element={<BusinessSetup />} />
        <Route path="/onboard/:token" element={<OnboardingPage />} />

        {/* Driver specific dashboard routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DriverLayout />
          </ProtectedRoute>
        }>
          <Route path="operations" element={<DriverOperations />} />
          <Route path="select-vehicle" element={<VehicleSelection />} />
          <Route path="history" element={<DriverHistory />} />
          <Route path="payments" element={<DriverPayments />} />
          <Route path="payments/add" element={<AddPaymentMethod />} />
          <Route path="success" element={<PaymentStatus />} />
          <Route path="cancel" element={<PaymentStatus />} />
        </Route>

        {/* Admin specific dashboard routes */}
        <Route path="/admin" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="fleet" element={<FleetPage />} />
          <Route path="drivers" element={<DriversPage />} />
          <Route path="rentals" element={<RentalsPage />} />
          <Route path="tracking" element={<LiveTracking />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="tolls" element={<TollsPage />} />
          <Route path="finance" element={<FinancePage />} />
          <Route path="compliance" element={<CompliancePage />} />
          <Route path="settings" element={<BusinessSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}


function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  );
}

export default App;
