import { useState, useRef, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { lookupTicketByQr, markTicketUsed, insertScan } from "../../checkin/db";

function getDeviceId() {
  // Simple device identifier — in production use expo-device or a stored UUID
  return "device-" + Math.random().toString(36).slice(2, 10);
}

const DEVICE_ID = getDeviceId();

export default function ScannerScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { eventId } = route.params ?? {};

  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const lastScanRef = useRef(null);

  const handleBarCodeScanned = useCallback(
    async ({ data: qrData }) => {
      // Debounce: ignore same QR within 3 seconds
      const now = Date.now();
      if (lastScanRef.current && lastScanRef.current.qr === qrData && now - lastScanRef.current.time < 3000) {
        return;
      }
      lastScanRef.current = { qr: qrData, time: now };
      setScanning(false);

      const scannedAt = new Date().toISOString();
      const ticket = await lookupTicketByQr(qrData);

      let result;
      let seatLabel = null;
      let sectionName = null;

      if (!ticket) {
        // Not found in local DB
        result = "invalid";
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (ticket.is_used) {
        // Already used
        result = "already_used";
        seatLabel = ticket.seat_label;
        sectionName = ticket.section_name;
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        // Valid — mark used locally
        result = "valid";
        seatLabel = ticket.seat_label;
        sectionName = ticket.section_name;
        await markTicketUsed(ticket.ticket_id, DEVICE_ID);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Record scan locally
      await insertScan({
        ticketId: ticket?.ticket_id ?? 0,
        scannedAt,
        deviceId: DEVICE_ID,
        result,
      });

      navigation.navigate("ScanResult", {
        result,
        seatLabel,
        sectionName,
        eventId,
      });
    },
    [navigation, eventId]
  );

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <Text className="text-slate-400">Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 px-6">
        <Text className="text-white text-center mb-4">
          Camera access is needed to scan QR codes.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          className="rounded-full bg-indigo-600 px-6 py-3"
        >
          <Text className="text-white font-medium">Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4">
          <Text className="text-indigo-400">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={scanning ? handleBarCodeScanned : undefined}
      />

      {/* Overlay */}
      <View className="absolute inset-0 items-center justify-center">
        {/* Targeting frame */}
        <View
          style={{
            width: 250,
            height: 250,
            borderWidth: 2,
            borderColor: "rgba(99,102,241,0.6)",
            borderRadius: 16,
          }}
        />
      </View>

      {/* Header */}
      <View className="absolute top-0 left-0 right-0 pt-14 px-4 flex-row items-center justify-between">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-white text-base font-medium">← Back</Text>
        </TouchableOpacity>
        <Text className="text-white text-sm font-medium">Scan Ticket QR</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Bottom hint */}
      <View className="absolute bottom-0 left-0 right-0 pb-10 items-center">
        <Text className="text-white/70 text-sm">
          {scanning ? "Point camera at a ticket QR code" : "Processing..."}
        </Text>
      </View>
    </View>
  );
}
