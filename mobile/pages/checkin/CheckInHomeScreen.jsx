import { useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { getEvents } from "../../api/events.api";
import { getEventTickets } from "../../api/checkin.api";
import { upsertTickets, getTicketCountForEvent, getPendingScanCount } from "../../checkin/db";

export default function CheckInHomeScreen() {
  const navigation = useNavigation();
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState(null);
  const [pendingCount, setPendingCount] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["events", { page: 1, pageSize: 100 }],
    queryFn: () => getEvents({ page: 1, pageSize: 100 }),
  });

  const events = data?.items ?? [];

  const handleSyncTickets = useCallback(async () => {
    if (!selectedEventId) {
      Alert.alert("Select Event", "Please select an event first.");
      return;
    }

    setSyncing(true);
    try {
      const tickets = await getEventTickets(selectedEventId);
      const ticketList = Array.isArray(tickets) ? tickets : tickets?.tickets ?? [];
      await upsertTickets(selectedEventId, ticketList);
      const count = await getTicketCountForEvent(selectedEventId);
      setSyncedCount(count);

      const pending = await getPendingScanCount();
      setPendingCount(pending);
    } catch (err) {
      Alert.alert("Sync Failed", err.message || "Could not download tickets.");
    } finally {
      setSyncing(false);
    }
  }, [selectedEventId]);

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-indigo-400 text-base">← Back</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-2 mb-4">
        <Text className="text-2xl font-bold text-white">Check-In</Text>
        <Text className="mt-1 text-sm text-slate-400">
          Select an event and sync tickets before scanning.
        </Text>
      </View>

      {/* Event list */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 200 }}
          renderItem={({ item }) => {
            const isSelected = selectedEventId === item.id;
            return (
              <TouchableOpacity
                onPress={() => setSelectedEventId(item.id)}
                className={`mx-4 mb-2 rounded-xl p-4 ${isSelected ? "bg-indigo-600/20 border border-indigo-500" : "bg-slate-800"}`}
                activeOpacity={0.7}
              >
                <Text className="text-white font-medium" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {item.starts_at || "Date TBA"} · {item.venue ?? ""}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View className="mt-10 items-center">
              <Text className="text-slate-400">No events found.</Text>
            </View>
          }
        />
      )}

      {/* Bottom controls */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-slate-950 border-t border-slate-800">
        {/* Sync info */}
        {syncedCount !== null ? (
          <View className="mb-3 flex-row justify-between">
            <Text className="text-xs text-slate-400">
              {syncedCount} ticket{syncedCount !== 1 ? "s" : ""} synced
            </Text>
            {pendingCount !== null && pendingCount > 0 ? (
              <TouchableOpacity onPress={() => navigation.navigate("SyncStatus")}>
                <Text className="text-xs text-yellow-400">
                  {pendingCount} pending sync{pendingCount !== 1 ? "s" : ""}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <View className="flex-row gap-3">
          {/* Sync button */}
          <TouchableOpacity
            className={`flex-1 h-12 rounded-full items-center justify-center ${
              syncing || !selectedEventId ? "bg-slate-700" : "bg-slate-600"
            }`}
            activeOpacity={0.8}
            disabled={syncing || !selectedEventId}
            onPress={handleSyncTickets}
          >
            {syncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <View className="flex-row items-center">
                <Feather name="download" size={16} color="#fff" />
                <Text className="text-white font-medium ml-2">Sync Tickets</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Start scanning */}
          <TouchableOpacity
            className={`flex-1 h-12 rounded-full items-center justify-center ${
              syncedCount && syncedCount > 0 ? "bg-indigo-600" : "bg-slate-700"
            }`}
            activeOpacity={0.8}
            disabled={!syncedCount || syncedCount === 0}
            onPress={() => navigation.navigate("Scanner", { eventId: selectedEventId })}
          >
            <View className="flex-row items-center">
              <Feather name="camera" size={16} color="#fff" />
              <Text className="text-white font-medium ml-2">Scan</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
