import { BrowserRouter, Routes, Route } from 'react-router-dom';
import InfoSection from './components/InfoSection';
import LoginBox from './components/LoginBox';
import InteractiveLight from './components/InteractiveLight';
import Dashboard from './components/Dashboard';
import Usuarios from './components/Usuarios';
import Sidebar from './components/Sidebar';
import './App.css';

function LoginPage() {
  return (
    <div className="container">
      <InteractiveLight />
      <InfoSection />
      <LoginBox />
    </div>
  );
}

function AdminLayout({ children }) {
  return (
    <div className="dash-page" style={{ overflow: 'auto' }}>
      <Sidebar />
      <main className="dash-main" style={{ flex: 1 }}>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
        <Route path="/admin/usuarios" element={<AdminLayout><Usuarios /></AdminLayout>} />
      </Routes>
    </BrowserRouter>
  );
}
