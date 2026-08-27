import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import Optimize from './pages/Optimize';
import Jobs from './pages/Jobs';
import Subscription from './pages/Subscription';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/optimize" element={<Optimize />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
