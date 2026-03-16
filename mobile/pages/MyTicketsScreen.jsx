import { useState } from "react";
import { View, Text, FlatList, RefreshControl, Pressable, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";
import { Feather } from "@expo/vector-icons";
import { getPurchases } from "../api/profile.api";
import { SkeletonList } from "../components/Skeleton";

const STATUS_COLOR = {
  paid: "text-green-400",
  pending: "text-yellow-400",
  failed: "text-red-400",
  cancelled: "text-slate-400",
};

function TicketQr({ qrCode, eventName, onEntryMode }) {
  return (
    <View className="mt-3 items-center gap-2">
      <View className="rounded-xl bg-white p-3">
        <QRCode value={qrCode} size={140} />
      </View>
      <Text className="text-[10px] text-slate-500 text-center px-2" numberOfLines={2}>
        {qrCode}
      </Text>
      <TouchableOpacity
        onPress={onEntryMode}
        className="mt-1 flex-row items-center rounded-lg bg-indigo-600 px-4 py-2"
        activeOpacity={0.7}
      >
        <Feather name="maximize" size={14} color="#fff" />
        <Text className="text-white text-xs font-medium ml-1.5">Entry Mode</Text>
      </TouchableOpacity>
    </View>
  );
}

function PurchaseCard({ item, navigation }) {
  const [expanded, setExpanded] = useState(false);
  const statusColor = STATUS_COLOR[item.status] ?? "text-slate-400";
  const amount = parseFloat(item.amount || 0).toFixed(2);
  const hasPaidTickets = item.status === "paid" && Array.isArray(item.tickets) && item.tickets.length > 0;

  return (
    <View className="mx-4 mb-3 rounded-xl bg-slate-800 p-4">
      <Pressable onPress={() => hasPaidTickets && setExpanded((v) => !v)}>
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-white flex-1 mr-2" numberOfLines={1}>
            {item.eventName ?? `Payment #${item.id}`}
          </Text>
          <Text className={`text-xs font-medium uppercase ${statusColor}`}>{item.status}</Text>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-sm text-slate-400">
            {item.currency ?? "RSD"} {amount}
          </Text>
          {hasPaidTickets ? (
            <Text className="text-xs text-indigo-400">
              {item.tickets.length} ticket{item.tickets.length !== 1 ? "s" : ""} · {expanded ? "hide" : "show"} QR
            </Text>
          ) : null}
        </View>
        {item.eventDate ? (
          <Text className="mt-0.5 text-xs text-slate-500">{item.eventDate}</Text>
        ) : null}
      </Pressable>

      {expanded && hasPaidTickets ? (
        <View className="mt-2 border-t border-slate-700 pt-3 gap-4">
          {item.tickets.map((ticket, idx) => (
            <View key={ticket.id} className="items-center">
              <Text className="text-xs text-slate-400 mb-1">Ticket #{idx + 1}</Text>
              <TicketQr
                qrCode={ticket.qrCode}
                eventName={item.eventName}
                onEntryMode={() =>
                  navigation.navigate("EntryMode", {
                    qrCode: ticket.qrCode,
                    eventTitle: item.eventName,
                    seatLabel: ticket.seatLabel ?? null,
                  })
                }
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function MyTicketsScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const { data, isLoading, error, isRefetching } = useQuery({
    queryKey: ["purchases"],
    queryFn: () => getPurchases(),
  });

  const purchases = data?.purchases ?? data?.items ?? (Array.isArray(data) ? data : []);

  if (isLoading) {
    return (
      <View className="flex-1 bg-slate-950">
        <View className="px-4 pt-14 pb-4">
          <Text className="text-2xl font-bold text-white">My Tickets</Text>
        </View>
        <SkeletonList count={4} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-4">
        <Text className="text-2xl font-bold text-white">My Tickets</Text>
      </View>

      {error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-slate-400">{error.message}</Text>
        </View>
      ) : (
        <FlatList
          data={purchases}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <PurchaseCard item={item} navigation={navigation} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["purchases"] })}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Text className="text-slate-400">You have no tickets yet.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
