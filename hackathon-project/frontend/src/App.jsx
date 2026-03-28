import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Upload from './pages/Upload';
import Dashboard from './pages/Dashboard';
import Predict from './pages/Predict';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<Home />} />

        {/* Task 2 & 3: CSV Upload + Dashboard */}
        <Route path="/upload" element={<Upload />} />
        <Route path="/dashboard/:sessionId" element={<Dashboard />} />

        {/* Scaffold route */}
        <Route path="/predict" element={<Predict />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
