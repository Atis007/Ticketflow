import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { getEventById } from "../api/events.api";
import { addFavorite, removeFavorite, getFavorites } from "../api/favorites.api";
import { SkeletonText } from "../components/Skeleton";

export default function EventDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId } = route.params ?? {};
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["events", eventId],
    queryFn: () => getEventById(eventId),
    enabled: Boolean(eventId),
  });

  const { data: favData } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => getFavorites({ pageSize: 50 }),
  });

  const event = data?.event ?? data ?? null;

  // Simple local toggle state, initialized from server
  const [isFavorited, setIsFavorited] = useState(false);

  useEffect(() => {
    if (!favData || !eventId) return;
    const favList = favData?.favorites ?? (Array.isArray(favData) ? favData : []);
    const eid = Number(eventId);
    const found = favList.some((f) => Number(f.id) === eid || Number(f.event_id) === eid);
    setIsFavorited(found);
  }, [favData, eventId]);

  const toggleFavorite = () => {
    const next = !isFavorited;
    setIsFavorited(next);

    const action = next ? addFavorite(eventId) : removeFavorite(eventId);
    action
      .then(() => queryClient.invalidateQueries({ queryKey: ["favorites"] }))
      .catch((err) => {
        // 409 = already favorited — keep the toggled state
        if (err.status === 409) return;
        setIsFavorited(!next); // revert on real failure
      });
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-950 px-4 pt-14">
        <SkeletonText width="40%" height={12} className="mb-4" />
        <SkeletonText width="80%" height={22} className="mb-3" />
        <SkeletonText width="50%" height={14} className="mb-2" />
        <SkeletonText width="45%" height={14} className="mb-2" />
        <SkeletonText width="35%" height={12} className="mb-6" />
        <SkeletonText width="100%" height={60} className="rounded-xl" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 px-6">
        <Text className="text-center text-slate-400">{error?.message || "Event not found."}</Text>
        <Pressable
          onPress={() => navigation.goBack()}
          className="mt-4 rounded-lg bg-slate-700 px-6 py-3"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const price = event.is_free ? "Free" : `RSD ${parseFloat(event.price || 0).toFixed(2)}`;

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 pt-14 pb-2 flex-row items-center justify-between">
          <Pressable onPress={() => navigation.goBack()} className="mr-3">
            <Text className="text-indigo-400 text-base">← Back</Text>
          </Pressable>
          <Pressable onPress={toggleFavorite} hitSlop={16}>
            <Feather name="heart" size={22} color={isFavorited ? "#f87171" : "#64748b"} />
          </Pressable>
        </View>

        <View className="px-4 mt-2">
          <Text className="text-2xl font-bold text-white">{event.title}</Text>

          {event.starts_at ? (
            <Text className="mt-2 text-sm text-slate-400">{event.starts_at}</Text>
          ) : null}

          {event.venue ? (
            <Text className="mt-1 text-sm text-slate-400">{event.venue}</Text>
          ) : null}

          {event.city ? (
            <Text className="mt-0.5 text-sm text-slate-500">{event.city}</Text>
          ) : null}

          {event.description ? (
            <Text className="mt-4 text-sm text-slate-300 leading-6">{event.description}</Text>
          ) : null}

          <View className="mt-6 rounded-xl bg-slate-800 p-4 flex-row items-center justify-between">
            <Text className="text-white font-semibold text-base">Price</Text>
            <Text className="text-indigo-400 font-bold text-base">{price}</Text>
          </View>
        </View>
      </ScrollView>

      {!event.is_free && (
        <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-slate-950">
          <Pressable
            className="h-14 rounded-full bg-indigo-600 items-center justify-center"
            onPress={() => {
              if (event.is_seated) {
                navigation.navigate("SeatSelection", {
                  eventId,
                  eventTitle: event.title,
                  eventPrice: event.price,
                });
              } else {
                navigation.navigate("Payment", {
                  eventId,
                  eventTitle: event.title,
                  seatIds: [],
                  totalAmount: parseFloat(event.price || 0),
                });
              }
            }}
          >
            <Text className="text-white font-semibold text-base">Get Tickets</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
