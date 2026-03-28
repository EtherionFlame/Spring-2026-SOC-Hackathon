import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Predict from './pages/Predict';
import Navbar from './components/Navbar';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/predict" element={<Predict />} />
      </Routes>
    </BrowserRouter>
  );
}
