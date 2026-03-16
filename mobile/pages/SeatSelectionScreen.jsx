import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import Svg, { Rect, Text as SvgText, G } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { useEventSeats } from "../hooks/useEventSeats";
import { useRealtimeSeats } from "../hooks/useRealtimeSeats";
import { useReserveSeat } from "../hooks/useReserveSeat";

const SEAT_SIZE = 28;
const SEAT_GAP = 4;
const ROW_HEIGHT = SEAT_SIZE + SEAT_GAP;
const SECTION_HEADER_HEIGHT = 36;
const SECTION_GAP = 24;
const ROW_LABEL_WIDTH = 28;
const SVG_PADDING = 12;

const STATUS_COLORS = {
  available: { fill: "rgba(16,185,129,0.2)", stroke: "rgba(16,185,129,0.3)", text: "#6ee7b7" },
  selected: { fill: "rgba(6,182,212,0.25)", stroke: "rgba(34,211,238,1)", text: "#a5f3fc" },
  sold: { fill: "rgba(239,68,68,0.1)", stroke: "rgba(239,68,68,0.2)", text: "rgba(248,113,113,0.5)" },
  locked: { fill: "rgba(245,158,11,0.15)", stroke: "rgba(245,158,11,0.3)", text: "rgba(252,211,77,0.7)" },
};

function buildLayout(seats, selectedIds) {
  const sections = new Map();

  for (const seat of seats) {
    const secId = seat.sectionId ?? 0;
    if (!sections.has(secId)) {
      sections.set(secId, { name: seat.sectionName ?? "General", rows: new Map() });
    }
    const section = sections.get(secId);
    const rowKey = seat.rowLabel ?? "–";
    if (!section.rows.has(rowKey)) {
      section.rows.set(rowKey, []);
    }
    section.rows.get(rowKey).push(seat);
  }

  let y = SVG_PADDING;
  let maxX = 0;
  const elements = [];

  for (const [secId, section] of sections) {
    // Section header
    elements.push({ type: "sectionHeader", text: section.name, y });
    y += SECTION_HEADER_HEIGHT;

    for (const [rowLabel, rowSeats] of section.rows) {
      // Row label
      elements.push({ type: "rowLabel", text: rowLabel, y: y + SEAT_SIZE / 2 });

      let x = SVG_PADDING + ROW_LABEL_WIDTH;
      for (const seat of rowSeats) {
        const isSelected = selectedIds.has(seat.id);
        const status = isSelected ? "selected" : seat.status;
        const colors = STATUS_COLORS[status] ?? STATUS_COLORS.sold;

        elements.push({
          type: "seat",
          seat,
          x,
          y,
          colors,
          isSelected,
          isInteractive: seat.status === "available" || isSelected,
        });

        x += SEAT_SIZE + SEAT_GAP;
      }
      if (x > maxX) maxX = x;
      y += ROW_HEIGHT;
    }
    y += SECTION_GAP;
  }

  return { elements, width: maxX + SVG_PADDING, height: y + SVG_PADDING };
}

export default function SeatSelectionScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId, eventTitle, eventPrice } = route.params ?? {};

  const [selectedIds, setSelectedIds] = useState(new Set());
  const { data, isLoading, error } = useEventSeats(eventId);
  useRealtimeSeats(eventId);
  const reserveMutation = useReserveSeat(eventId);

  const seats = data?.seats ?? [];
  const seatPrice = eventPrice ?? 0;

  const layout = useMemo(() => buildLayout(seats, selectedIds), [seats, selectedIds]);

  const toggleSeat = useCallback((seatId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(seatId)) {
        next.delete(seatId);
      } else {
        next.add(seatId);
      }
      return next;
    });
  }, []);

  const handleReserve = useCallback(async () => {
    if (selectedIds.size === 0) return;

    try {
      const result = await reserveMutation.mutateAsync([...selectedIds]);
      navigation.navigate("Reservation", {
        eventId,
        eventTitle,
        seatIds: result.reserved ?? [...selectedIds],
        expiresInMinutes: result.expiresInMinutes ?? 10,
        totalAmount: selectedIds.size * parseFloat(seatPrice),
        selectedSeats: seats
          .filter((s) => selectedIds.has(s.id))
          .map((s) => `${s.sectionName ?? ""} ${s.rowLabel}${s.seatNumber}`.trim()),
      });
    } catch (err) {
      Alert.alert("Reservation Failed", err.message || "Some seats are no longer available.");
      setSelectedIds(new Set());
    }
  }, [selectedIds, reserveMutation, navigation, eventId, eventTitle, seatPrice, seats]);

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
        <Text className="text-center text-slate-400">{error.message}</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 rounded-lg bg-slate-700 px-6 py-3">
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const screenWidth = Dimensions.get("window").width;
  const totalPrice = selectedIds.size * parseFloat(seatPrice);

  return (
    <View className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="px-4 pt-14 pb-2 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-indigo-400 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="text-white font-semibold text-base" numberOfLines={1}>
          Select Seats
        </Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Legend */}
      <View className="flex-row justify-center gap-4 px-4 pb-3">
        {["available", "selected", "sold", "locked"].map((status) => (
          <View key={status} className="flex-row items-center">
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 2,
                backgroundColor: STATUS_COLORS[status].fill,
                borderWidth: 1,
                borderColor: STATUS_COLORS[status].stroke,
                marginRight: 4,
              }}
            />
            <Text className="text-xs text-slate-400 capitalize">{status}</Text>
          </View>
        ))}
      </View>

      {/* Summary */}
      <View className="mx-4 mb-2 rounded-lg bg-slate-800 px-3 py-2 flex-row justify-between">
        <Text className="text-xs text-slate-400">
          Available: {data?.summary?.available ?? "–"}
        </Text>
        <Text className="text-xs text-slate-400">
          Sold: {data?.summary?.sold ?? "–"}
        </Text>
      </View>

      {/* Seat Map */}
      <ScrollView
        className="flex-1"
        maximumZoomScale={3}
        minimumZoomScale={0.5}
        contentContainerStyle={{ alignItems: "center", paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={Math.max(layout.width, screenWidth - 32)} height={layout.height}>
            {layout.elements.map((el, i) => {
              if (el.type === "sectionHeader") {
                return (
                  <SvgText
                    key={`sh-${i}`}
                    x={SVG_PADDING}
                    y={el.y + 14}
                    fill="#94a3b8"
                    fontSize={13}
                    fontWeight="600"
                  >
                    {el.text}
                  </SvgText>
                );
              }
              if (el.type === "rowLabel") {
                return (
                  <SvgText
                    key={`rl-${i}`}
                    x={SVG_PADDING + 4}
                    y={el.y + 4}
                    fill="#64748b"
                    fontSize={10}
                    textAnchor="start"
                  >
                    {el.text}
                  </SvgText>
                );
              }
              if (el.type === "seat") {
                return (
                  <G
                    key={`s-${el.seat.id}`}
                    onPress={el.isInteractive ? () => toggleSeat(el.seat.id) : undefined}
                  >
                    <Rect
                      x={el.x}
                      y={el.y}
                      width={SEAT_SIZE}
                      height={SEAT_SIZE}
                      rx={4}
                      ry={4}
                      fill={el.colors.fill}
                      stroke={el.colors.stroke}
                      strokeWidth={1}
                    />
                    <SvgText
                      x={el.x + SEAT_SIZE / 2}
                      y={el.y + SEAT_SIZE / 2 + 4}
                      fill={el.colors.text}
                      fontSize={9}
                      textAnchor="middle"
                    >
                      {el.seat.seatNumber}
                    </SvgText>
                  </G>
                );
              }
              return null;
            })}
          </Svg>
        </ScrollView>
      </ScrollView>

      {/* Bottom bar */}
      <View className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-slate-950 border-t border-slate-800">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-slate-300 text-sm">
            {selectedIds.size} seat{selectedIds.size !== 1 ? "s" : ""} selected
          </Text>
          <Text className="text-indigo-400 font-bold text-base">
            RSD {totalPrice.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity
          className={`h-14 rounded-full items-center justify-center ${
            selectedIds.size > 0 && !reserveMutation.isPending ? "bg-indigo-600" : "bg-slate-700"
          }`}
          activeOpacity={0.8}
          disabled={selectedIds.size === 0 || reserveMutation.isPending}
          onPress={handleReserve}
        >
          <Text className="text-white font-semibold text-base">
            {reserveMutation.isPending ? "Reserving..." : "Reserve Seats"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
