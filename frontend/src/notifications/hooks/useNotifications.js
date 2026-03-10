import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../auth/context/AuthContext";
import {
  getNotifications,
  markNotificationRead,
  markAllRead,
  deleteNotification,
} from "../notifications.api";

export function useNotifications() {
  const { token, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => getNotifications(token),
    enabled: isAuthenticated,
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}

export function useMarkNotificationRead() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => markNotificationRead(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useMarkAllRead() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllRead(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => deleteNotification(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
