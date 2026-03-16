import { TouchableOpacity, Text } from "react-native";

export default function EventCard({ item, onPress }) {
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
