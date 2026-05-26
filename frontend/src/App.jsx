import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage    from './pages/LandingPage';
import AdoptantAuth   from './pages/auth/AdoptantAuth';
import ShelterAuth    from './pages/auth/ShelterAuth';
import AuthCallback   from './pages/auth/AuthCallback';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword  from './pages/auth/ResetPassword';
import Questionnaire  from './pages/adoptant/Questionnaire';
import Swiper         from './pages/adoptant/Swiper';
import MatchHistory   from './pages/adoptant/MatchHistory';
import AnimalDetail   from './pages/adoptant/AnimalDetail';
import Profile        from './pages/adoptant/Profile';
import Dashboard      from './pages/shelter/Dashboard';
import AnimalForm     from './pages/shelter/AnimalForm';
import ShelterProfile from './pages/shelter/ShelterProfile';
import CGU            from './pages/legal/CGU';
import PrivacyPolicy  from './pages/legal/PrivacyPolicy';
import AnimalPublic   from './pages/AnimalPublic';

function PrivateRoute({ children, requiredRole }) {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { token, role } = useAuth();

  return (
    <Routes>
      {/* Landing — redirige si déjà connecté */}
      <Route
        path="/"
        element={
          token
            ? role === 'adoptant'
              ? <Navigate to="/adoptant/swipe" replace />
              : <Navigate to="/shelter/dashboard" replace />
            : <LandingPage />
        }
      />

      {/* Callback Google OAuth */}
      <Route path="/auth/callback" element={<AuthCallback />} />

      {/* Mot de passe oublié / réinitialisation */}
      <Route path="/auth/forgot-password" element={<ForgotPassword />} />
      <Route path="/auth/reset-password"  element={<ResetPassword  />} />

      {/* Auth adoptant */}
      <Route path="/adoptant/login"    element={<AdoptantAuth mode="login"    />} />
      <Route path="/adoptant/register" element={<AdoptantAuth mode="register" />} />

      {/* Auth refuge */}
      <Route path="/shelter/login"    element={<ShelterAuth mode="login"    />} />
      <Route path="/shelter/register" element={<ShelterAuth mode="register" />} />

      {/* Pages protégées — adoptant */}
      <Route path="/adoptant/questionnaire" element={
        <PrivateRoute requiredRole="adoptant"><Questionnaire /></PrivateRoute>
      }/>
      <Route path="/adoptant/swipe" element={
        <PrivateRoute requiredRole="adoptant"><Swiper /></PrivateRoute>
      }/>
      <Route path="/adoptant/matches" element={
        <PrivateRoute requiredRole="adoptant"><MatchHistory /></PrivateRoute>
      }/>
      <Route path="/adoptant/profile" element={
        <PrivateRoute requiredRole="adoptant"><Profile /></PrivateRoute>
      }/>
      <Route path="/adoptant/animal" element={
        <PrivateRoute requiredRole="adoptant"><AnimalDetail /></PrivateRoute>
      }/>

      {/* Pages protégées — refuge */}
      <Route path="/shelter/dashboard" element={
        <PrivateRoute requiredRole="shelter"><Dashboard /></PrivateRoute>
      }/>
      <Route path="/shelter/animals/add" element={
        <PrivateRoute requiredRole="shelter"><AnimalForm /></PrivateRoute>
      }/>
      <Route path="/shelter/animals/:id/edit" element={
        <PrivateRoute requiredRole="shelter"><AnimalForm /></PrivateRoute>
      }/>
      <Route path="/shelter/profile" element={
        <PrivateRoute requiredRole="shelter"><ShelterProfile /></PrivateRoute>
      }/>

      {/* Page publique animal — accessible sans compte */}
      <Route path="/animal/:id" element={<AnimalPublic />} />

      {/* Pages légales */}
      <Route path="/legal/cgu"     element={<CGU />} />
      <Route path="/legal/privacy" element={<PrivacyPolicy />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
