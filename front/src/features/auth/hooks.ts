import { useMutation } from '@tanstack/react-query';
import {
  login as loginApi,
  logout as logoutApi,
  register as registerApi,
} from '@/features/auth/api';
import { useAuthStore } from '@/features/auth/store';

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth);
  return useMutation({ mutationFn: loginApi, onSuccess: (d) => setAuth(d.accessToken, d.user) });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  return useMutation({ mutationFn: logoutApi, onSettled: () => clear() });
}

export function useRegister() {
  return useMutation({ mutationFn: registerApi });
}
