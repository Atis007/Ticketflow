import { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import * as Brightness from "expo-brightness";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import QRCode from "react-native-qrcode-svg";

const screenWidth = Dimensions.get("window").width;
const QR_SIZE = screenWidth - 64;

export default function EntryModeScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { qrCode, eventTitle, seatLabel } = route.params ?? {};
  const originalBrightness = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        originalBrightness.current = await Brightness.getBrightnessAsync();
        await Brightness.setBrightnessAsync(1.0);
      } catch {}

      try {
        await activateKeepAwakeAsync("entry-mode");
      } catch {}
    })();

    return () => {
      (async () => {
        try {
          if (originalBrightness.current !== null) {
            await Brightness.setBrightnessAsync(originalBrightness.current);
          }
        } catch {}

        try {
          deactivateKeepAwake("entry-mode");
        } catch {}
      })();
    };
  }, []);

  if (!qrCode) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Text className="text-slate-400 text-center">No QR code available.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-4 rounded-lg bg-slate-700 px-6 py-3">
          <Text className="text-white font-medium">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black items-center justify-center px-8">
      {/* Event title */}
      {eventTitle ? (
        <Text className="text-white text-lg font-semibold text-center mb-2" numberOfLines={2}>
          {eventTitle}
        </Text>
      ) : null}

      {seatLabel ? (
        <Text className="text-slate-400 text-sm text-center mb-6">{seatLabel}</Text>
      ) : (
        <View className="mb-6" />
      )}

      {/* QR Code */}
      <View className="rounded-2xl bg-white p-5">
        <QRCode value={qrCode} size={QR_SIZE} />
      </View>

      <Text className="mt-6 text-slate-500 text-xs text-center">
        Show this QR code at the entrance
      </Text>

      {/* Close button */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        className="mt-8 h-12 w-full rounded-full bg-slate-800 items-center justify-center"
        activeOpacity={0.8}
      >
        <Text className="text-white font-medium">Close</Text>
      </TouchableOpacity>
    </View>
  );
}
