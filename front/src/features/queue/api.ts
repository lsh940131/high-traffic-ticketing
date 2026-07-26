import { api } from '@/shared/api/client';
import type { QueueStatus, ReservationResult, Seat } from '@/shared/types';

export const enterQueue = (concertId: string) =>
  api.post<QueueStatus>(`/queue/${concertId}/enter`).then((r) => r.data);

export const getQueueStatus = (concertId: string) =>
  api.get<QueueStatus>(`/queue/${concertId}/status`).then((r) => r.data);

export const leaveQueue = (concertId: string) =>
  api.post<{ ok: boolean }>(`/queue/${concertId}/leave`).then((r) => r.data);

export const getSeats = (eventId: string) =>
  api.get<Seat[]>(`/events/${eventId}/seats`).then((r) => r.data);

export const holdSeat = (eventId: string, seatId: string) =>
  api.post(`/events/${eventId}/seats/${seatId}/hold`).then((r) => r.data);

export const requestReservation = (eventId: string, seatId: string) =>
  api.post<{ reservationId: string }>(`/reservations`, { eventId, seatId }).then((r) => r.data);

export const getReservationResult = (reservationId: string) =>
  api.get<ReservationResult>(`/reservations/${reservationId}`).then((r) => r.data);
