import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QueuePage from '@/pages/QueuePage';
import ReservationStatusPage from '@/pages/ReservationStatusPage';

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/events/demo/queue" />} />
          <Route path="/events/:eventId/queue" element={<QueuePage />} />
          <Route path="/reservations/:reservationId" element={<ReservationStatusPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
