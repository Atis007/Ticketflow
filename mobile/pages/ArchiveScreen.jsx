import { View, Text, FlatList, RefreshControl, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import http from "../api/http";
import { SkeletonList } from "../components/Skeleton";

async function getArchive() {
  return http.get("api/tickets/archive");
}

function ArchiveTicketCard({ item }) {
  const date = item.eventDate ?? item.starts_at ?? "";

  return (
    <View className="mx-4 mb-3 rounded-xl bg-slate-800 p-4">
      <Text className="text-sm font-semibold text-white" numberOfLines={1}>
        {item.eventName ?? item.title ?? `Ticket #${item.id}`}
      </Text>
      {date ? (
        <Text className="mt-1 text-xs text-slate-400">{date}</Text>
      ) : null}
      {item.venue ? (
        <Text className="mt-0.5 text-xs text-slate-500">{item.venue}</Text>
      ) : null}
      <View className="mt-2 flex-row items-center">
        <View className="rounded-full bg-slate-700 px-2.5 py-0.5">
          <Text className="text-[10px] text-slate-400 uppercase">
            {item.is_used ? "Used" : "Past"}
          </Text>
        </View>
        {item.seatLabel ? (
          <Text className="ml-2 text-xs text-slate-500">{item.seatLabel}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ArchiveScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data, isLoading, error, isRefetching } = useQuery({
    queryKey: ["tickets", "archive"],
    queryFn: getArchive,
  });

  const tickets = Array.isArray(data) ? data : data?.items ?? data?.tickets ?? [];

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-950">
        <View className="px-4 pt-14 pb-2 flex-row items-center">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text className="text-indigo-400 text-base">← Back</Text>
          </TouchableOpacity>
        </View>
        <View className="px-4 mt-2 mb-4">
          <Text className="text-2xl font-bold text-white">Past Events</Text>
        </View>
        <SkeletonList count={4} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-indigo-400 text-base">← Back</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-2 mb-4">
        <Text className="text-2xl font-bold text-white">Past Events</Text>
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-slate-400">{error.message}</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <ArchiveTicketCard item={item} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["tickets", "archive"] })}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Text className="text-slate-400">No past events.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
