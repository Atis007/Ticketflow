import { View, Text, FlatList, RefreshControl, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { getFavorites, removeFavorite } from "../api/favorites.api";
import { SkeletonList } from "../components/Skeleton";
import EventCard from "../components/EventCard";

export default function FavoritesScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data, isLoading, error, isRefetching } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => getFavorites({ page: 1, pageSize: 50 }),
  });

  const favorites = data?.favorites ?? (Array.isArray(data) ? data : []);
  // Map backend favorites shape to EventCard-compatible shape
  const events = favorites.map((f) => ({
    ...f,
    starts_at: f.date ?? f.starts_at,
    venue: f.location ?? f.venue,
  }));

  const handleRemove = (eventId) => {
    removeFavorite(eventId)
      .then(() => queryClient.invalidateQueries({ queryKey: ["favorites"] }))
      .catch(() => {});
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-950">
        <View className="px-4 pt-14 pb-2 flex-row items-center">
          <Pressable onPress={() => navigation.goBack()}>
            <Text className="text-indigo-400 text-base">← Back</Text>
          </Pressable>
        </View>
        <View className="px-4 mt-2 mb-4">
          <Text className="text-2xl font-bold text-white">Favorites</Text>
        </View>
        <SkeletonList count={4} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-2 flex-row items-center">
        <Pressable onPress={() => navigation.goBack()}>
          <Text className="text-indigo-400 text-base">← Back</Text>
        </Pressable>
      </View>

      <View className="px-4 mt-2 mb-4">
        <Text className="text-2xl font-bold text-white">Favorites</Text>
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-slate-400">{error.message}</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <View className="flex-row items-center">
              <View className="flex-1">
                <EventCard
                  item={item}
                  onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}
                />
              </View>
              <Pressable
                onPress={() => handleRemove(item.id)}
                hitSlop={16}
                className="mr-4"
              >
                <Feather name="heart" size={20} color="#f87171" />
              </Pressable>
            </View>
          )}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["favorites"] })}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Text className="text-slate-400">No favorite events yet.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
