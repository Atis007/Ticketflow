import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { getEventById } from "../api/events.api";

export default function EventDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId } = route.params ?? {};

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!eventId) {
      setError("No event specified.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const data = await getEventById(eventId);
        if (!cancelled) {
          setEvent(data?.event ?? data ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load event.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error || !event) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 px-6">
        <Text className="text-center text-slate-400">{error || "Event not found."}</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="mt-4 rounded-lg bg-slate-700 px-6 py-3"
        >
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const price = event.is_free ? "Free" : `RSD ${parseFloat(event.price || 0).toFixed(2)}`;

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-4 pt-14 pb-2 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
            <Text className="text-indigo-400 text-base">← Back</Text>
          </TouchableOpacity>
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
          <TouchableOpacity
            className="h-14 rounded-full bg-indigo-600 items-center justify-center"
            activeOpacity={0.8}
          >
            <Text className="text-white font-semibold text-base">Get Tickets</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
