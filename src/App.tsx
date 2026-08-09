import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Optimize from './pages/Optimize';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/optimize" element={<Optimize />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
