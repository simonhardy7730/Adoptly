import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import LandingPage          from './pages/LandingPage';
import AdoptantAuth         from './pages/auth/AdoptantAuth';
import ShelterAuth          from './pages/auth/ShelterAuth';
import FosterAuth           from './pages/auth/FosterAuth';
import AuthCallback         from './pages/auth/AuthCallback';
import ForgotPassword       from './pages/auth/ForgotPassword';
import ResetPassword        from './pages/auth/ResetPassword';
import Questionnaire        from './pages/adoptant/Questionnaire';
import Swiper               from './pages/adoptant/Swiper';
import MatchHistory         from './pages/adoptant/MatchHistory';
import AnimalDetail         from './pages/adoptant/AnimalDetail';
import Profile              from './pages/adoptant/Profile';
import Dashboard            from './pages/shelter/Dashboard';
import AnimalForm           from './pages/shelter/AnimalForm';
import ShelterProfile       from './pages/shelter/ShelterProfile';
import FosterQuestionnaire  from './pages/foster/FosterQuestionnaire';
import FosterSwipe          from './pages/foster/FosterSwipe';
import FosterMatches        from './pages/foster/FosterMatches';
import CGU                  from './pages/legal/CGU';
import PrivacyPolicy        from './pages/legal/PrivacyPolicy';
import AnimalPublic         from './pages/AnimalPublic';
import ShelterList          from './pages/ShelterList';
import ForRefuges           from './pages/ForRefuges';
import AdminDashboard       from './pages/admin/AdminDashboard';
import AdoptionSuccess      from './pages/AdoptionSuccess';
import CookieBanner         from './components/CookieBanner';

function PrivateRoute({ children, requiredRole }) {
  const { token, role } = useAuth();
  // Fallback localStorage — évite le bug de timing où login() met à jour
  // le contexte de manière asynchrone mais navigate() est déjà appelé.
  const effectiveToken = token || localStorage.getItem('token');
  const effectiveRole  = role  || localStorage.getItem('role');
  if (!effectiveToken) return <Navigate to="/" replace />;
  if (requiredRole && effectiveRole !== requiredRole) return <Navigate to="/" replace />;
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
              : role === 'foster'
                ? <Navigate to="/famille-accueil/swipe" replace />
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

      {/* Auth famille d'accueil */}
      <Route path="/famille-accueil/login"    element={<FosterAuth mode="login"    />} />
      <Route path="/famille-accueil/register" element={<FosterAuth mode="register" />} />

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

      {/* Pages protégées — famille d'accueil */}
      <Route path="/famille-accueil/questionnaire" element={
        <PrivateRoute requiredRole="foster"><FosterQuestionnaire /></PrivateRoute>
      }/>
      <Route path="/famille-accueil/swipe" element={
        <PrivateRoute requiredRole="foster"><FosterSwipe /></PrivateRoute>
      }/>
      <Route path="/famille-accueil/matches" element={
        <PrivateRoute requiredRole="foster"><FosterMatches /></PrivateRoute>
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

      {/* Dashboard admin — protégé par mot de passe interne */}
      <Route path="/admin"      element={<AdminDashboard />} />
      <Route path="/adoptions" element={<AdoptionSuccess />} />

      {/* Page publique refuges partenaires */}
      <Route path="/refuges" element={<ShelterList />} />

      {/* Landing page pour les refuges */}
      <Route path="/pour-les-refuges" element={<ForRefuges />} />

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
      <LanguageProvider>
        <BrowserRouter>
          <AppRoutes />
          <CookieBanner />
        </BrowserRouter>
      </LanguageProvider>
    </AuthProvider>
  );
}
