import { Link, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import MoviesPage from './pages/MoviesPage';
import RewatchPage from './pages/RewatchPage';
import BookingPage from './pages/BookingPage';

function NotFound() {
  return (
    <div className="card mx-auto max-w-md px-6 py-14 text-center">
      <h1 className="text-xl font-semibold text-white">Page not found</h1>
      <p className="mt-2 text-sm text-slate-400">That page does not exist.</p>
      <Link to="/movies" className="btn-primary mt-5">
        Back to Movies
      </Link>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/movies" replace />} />
        <Route path="/movies" element={<MoviesPage />} />
        <Route path="/rewatch" element={<RewatchPage />} />
        <Route path="/booking" element={<BookingPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
