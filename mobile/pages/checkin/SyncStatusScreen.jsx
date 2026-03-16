import { useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { getPendingScans, markScansAsSynced, getPendingScanCount } from "../../checkin/db";
import { syncScans } from "../../api/checkin.api";

export default function SyncStatusScreen() {
  const navigation = useNavigation();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  const refreshCount = useCallback(async () => {
    const count = await getPendingScanCount();
    setPendingCount(count);
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setLastSyncResult(null);

    try {
      const pendingScans = await getPendingScans();

      if (pendingScans.length === 0) {
        setLastSyncResult({ success: true, message: "Nothing to sync." });
        setSyncing(false);
        return;
      }

      // Format scans for the API
      const payload = pendingScans.map((scan) => ({
        ticket_id: scan.ticket_id,
        qr_code: scan.qr_code ?? undefined,
        scanned_at: scan.scanned_at,
      }));

      const result = await syncScans(payload);

      // Mark synced scans
      const syncedIds = pendingScans.map((s) => s.id);
      await markScansAsSynced(syncedIds);

      const syncedCount = syncedIds.length;
      setLastSyncResult({
        success: true,
        message: `${syncedCount} scan${syncedCount !== 1 ? "s" : ""} synced successfully.`,
      });

      await refreshCount();
    } catch (err) {
      setLastSyncResult({
        success: false,
        message: err.message || "Sync failed. Check your connection.",
      });
    } finally {
      setSyncing(false);
    }
  }, [refreshCount]);

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="text-indigo-400 text-base">← Back</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 mt-4">
        <Text className="text-2xl font-bold text-white">Sync Status</Text>
      </View>

      {/* Pending scans card */}
      <View className="mx-4 mt-6 rounded-xl bg-slate-800 p-5 items-center">
        <Feather
          name={pendingCount > 0 ? "upload-cloud" : "check-circle"}
          size={40}
          color={pendingCount > 0 ? "#fbbf24" : "#34d399"}
        />
        <Text className="text-3xl font-bold text-white mt-3">{pendingCount}</Text>
        <Text className="text-sm text-slate-400 mt-1">
          pending scan{pendingCount !== 1 ? "s" : ""}
        </Text>
      </View>

      {/* Last sync result */}
      {lastSyncResult ? (
        <View
          className={`mx-4 mt-4 rounded-xl p-4 ${
            lastSyncResult.success ? "bg-emerald-900/30" : "bg-red-900/30"
          }`}
        >
          <Text
            className={`text-sm text-center ${
              lastSyncResult.success ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {lastSyncResult.message}
          </Text>
        </View>
      ) : null}

      {/* Sync button */}
      <View className="mx-4 mt-6">
        <TouchableOpacity
          className={`h-14 rounded-full items-center justify-center ${
            syncing ? "bg-slate-700" : "bg-indigo-600"
          }`}
          activeOpacity={0.8}
          disabled={syncing}
          onPress={handleSync}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <View className="flex-row items-center">
              <Feather name="refresh-cw" size={18} color="#fff" />
              <Text className="text-white font-semibold text-base ml-2">Sync Now</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Refresh count */}
      <TouchableOpacity onPress={refreshCount} className="mt-4 items-center">
        <Text className="text-indigo-400 text-sm">Refresh count</Text>
      </TouchableOpacity>
    </View>
  );
}
