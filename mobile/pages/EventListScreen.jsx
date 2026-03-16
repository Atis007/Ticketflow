import { View, Text, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getEvents } from "../api/events.api";
import EventCard from "../components/EventCard";
import { SkeletonList } from "../components/Skeleton";

export default function EventListScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data, isLoading, error, isRefetching } = useQuery({
    queryKey: ["events", { page: 1, pageSize: 50 }],
    queryFn: () => getEvents({ page: 1, pageSize: 50 }),
  });

  const events = data?.items ?? [];

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-950">
        <View className="px-4 pt-14 pb-4">
          <Text className="text-2xl font-bold text-white">Events</Text>
        </View>
        <SkeletonList count={6} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 px-6">
        <Text className="text-center text-slate-400">{error.message}</Text>
        <TouchableOpacity
          onPress={() => queryClient.invalidateQueries({ queryKey: ["events"] })}
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
            refreshing={isRefetching}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ["events"] })}
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
