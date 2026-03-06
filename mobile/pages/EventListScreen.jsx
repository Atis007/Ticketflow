import { useState, useEffect, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getEvents } from "../api/events.api";

function EventCard({ item, onPress }) {
  const price = item.is_free ? "Free" : `RSD ${parseFloat(item.price || 0).toFixed(2)}`;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="mx-4 mb-3 rounded-xl bg-slate-800 p-4"
      activeOpacity={0.8}
    >
      <Text className="text-base font-semibold text-white" numberOfLines={2}>
        {item.title}
      </Text>
      <Text className="mt-1 text-sm text-slate-400" numberOfLines={1}>
        {item.starts_at || "Date TBA"}
      </Text>
      {item.venue ? (
        <Text className="mt-0.5 text-sm text-slate-400" numberOfLines={1}>
          {item.venue}
        </Text>
      ) : null}
      <Text className="mt-2 text-sm font-medium text-indigo-400">{price}</Text>
    </TouchableOpacity>
  );
}

export default function EventListScreen() {
  const navigation = useNavigation();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async (refreshing = false) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getEvents({ page: 1, pageSize: 50 });
      setEvents(data?.items ?? []);
    } catch (err) {
      setError(err.message || "Failed to load events");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 px-6">
        <Text className="text-center text-slate-400">{error}</Text>
        <TouchableOpacity
          onPress={() => fetchEvents()}
          className="mt-4 rounded-lg bg-indigo-600 px-6 py-3"
        >
          <Text className="text-white font-medium">Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-4">
        <Text className="text-2xl font-bold text-white">Events</Text>
      </View>
      <FlatList
        data={events}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <EventCard
            item={item}
            onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchEvents(true)}
            tintColor="#6366f1"
          />
        }
        ListEmptyComponent={
          <View className="mt-20 items-center">
            <Text className="text-slate-400">No events available.</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}
