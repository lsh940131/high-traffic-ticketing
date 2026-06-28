import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import QueuePage from './pages/QueuePage';
import ReservationStatusPage from './pages/ReservationStatusPage';

const qc = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/events/demo/queue" />} />
          <Route path="/events/:eventId/queue" element={<QueuePage />} />
          <Route path="/reservations/:reservationId" element={<ReservationStatusPage />} />
          {/* S3 좌석선택, S4 주문확인 화면은 figma 스펙 기준으로 추가 */}
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
