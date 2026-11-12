import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/authContext';
import { CompareProvider } from './lib/compareContext';
import { ToastProvider } from './lib/toastContext';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { CompareBar } from './components/common/CompareBar';
import { HomePage } from './pages/HomePage';
import { PropertiesPage } from './pages/PropertiesPage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { SellPropertyPage } from './pages/SellPropertyPage';
import { SavedPropertiesPage } from './pages/SavedPropertiesPage';
import { ProfessionalsPage } from './pages/ProfessionalsPage';
import { ProfessionalDetailPage } from './pages/ProfessionalDetailPage';
import { BecomeProfessionalPage } from './pages/BecomeProfessionalPage';
import { FindWorkPage } from './pages/FindWorkPage';
import { PostJobPage } from './pages/PostJobPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { DashboardPage } from './pages/DashboardPage';
import { AdminPage } from './pages/AdminPage';
import { MessagesPage } from './pages/MessagesPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { PlansPage } from './pages/PlansPage';
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from './pages/AuthPages';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CompareProvider>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />

                  {/* Property Marketplace */}
                  <Route path="/buy" element={<PropertiesPage fixedPurpose="buy" />} />
                  <Route path="/rent" element={<PropertiesPage fixedPurpose="rent" />} />
                  <Route path="/properties" element={<PropertiesPage />} />
                  <Route path="/properties/:id" element={<PropertyDetailPage />} />
                  <Route path="/properties/:id/edit" element={<SellPropertyPage />} />
                  <Route path="/sell" element={<SellPropertyPage />} />
                  <Route path="/saved" element={<SavedPropertiesPage />} />

                {/* Professional Marketplace */}
                <Route path="/professionals" element={<ProfessionalsPage />} />
                <Route path="/professionals/:id" element={<ProfessionalDetailPage />} />
                <Route path="/become-professional" element={<BecomeProfessionalPage />} />

                {/* Work Marketplace */}
                <Route path="/find-work" element={<FindWorkPage />} />
                <Route path="/post-job" element={<PostJobPage />} />
                <Route path="/jobs/:id" element={<JobDetailPage />} />

                <Route path="/projects" element={<Navigate to="/dashboard" replace />} />
                <Route path="/projects/:id" element={<Navigate to="/dashboard" replace />} />

                {/* Dashboards, Messaging, Plans & Auth */}
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/plans" element={<PlansPage />} />

                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
              <CompareBar />
              <Footer />
            </div>
          </CompareProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
