import { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { searchEvents, getCategories } from "../api/events.api";
import { SkeletonList } from "../components/Skeleton";
import EventCard from "../components/EventCard";

function CategoryChip({ label, active, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`mr-2 rounded-full px-4 py-2 ${active ? "bg-indigo-600" : "bg-slate-800"}`}
      activeOpacity={0.7}
    >
      <Text className={`text-sm font-medium ${active ? "text-white" : "text-slate-300"}`}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function EventSearchScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedCity, setSelectedCity] = useState("");

  const filters = useMemo(
    () => ({
      category: selectedCategory,
      city: selectedCity || undefined,
      page: 1,
      pageSize: 50,
    }),
    [selectedCategory, selectedCity]
  );

  const { data: categoriesData } = useQuery({
    queryKey: ["categories"],
    queryFn: getCategories,
    staleTime: 5 * 60 * 1000,
  });

  const categories = Array.isArray(categoriesData) ? categoriesData : categoriesData?.items ?? [];

  const { data, isLoading, error, isRefetching } = useQuery({
    queryKey: ["events", "search", filters],
    queryFn: () => searchEvents(filters),
  });

  const allEvents = data?.items ?? [];

  // Client-side text filter (backend has no text search param)
  const events = useMemo(() => {
    if (!searchText.trim()) return allEvents;
    const q = searchText.toLowerCase();
    return allEvents.filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.venue?.toLowerCase().includes(q) ||
        e.city?.toLowerCase().includes(q)
    );
  }, [allEvents, searchText]);

  const handleCategoryPress = useCallback((slug) => {
    setSelectedCategory((prev) => (prev === slug ? null : slug));
  }, []);

  const clearFilters = useCallback(() => {
    setSearchText("");
    setSelectedCategory(null);
    setSelectedCity("");
  }, []);

  const hasFilters = searchText || selectedCategory || selectedCity;

  return (
    <View className="flex-1 bg-slate-950">
      <View className="px-4 pt-14 pb-2">
        <Text className="text-2xl font-bold text-white">Search</Text>
      </View>

      {/* Search input */}
      <View className="mx-4 mb-3 flex-row items-center rounded-xl bg-slate-800 px-4 py-3">
        <Feather name="search" size={18} color="#94a3b8" />
        <TextInput
          className="ml-3 flex-1 text-white text-sm"
          placeholder="Search events, venues, cities..."
          placeholderTextColor="#64748b"
          value={searchText}
          onChangeText={setSearchText}
          autoCorrect={false}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText("")}>
            <Feather name="x" size={18} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* City filter */}
      <View className="mx-4 mb-3 flex-row items-center rounded-xl bg-slate-800 px-4 py-3">
        <Feather name="map-pin" size={16} color="#94a3b8" />
        <TextInput
          className="ml-3 flex-1 text-white text-sm"
          placeholder="Filter by city..."
          placeholderTextColor="#64748b"
          value={selectedCity}
          onChangeText={setSelectedCity}
          autoCorrect={false}
        />
        {selectedCity ? (
          <TouchableOpacity onPress={() => setSelectedCity("")}>
            <Feather name="x" size={16} color="#94a3b8" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Category chips */}
      {categories.length > 0 ? (
        <View className="mb-3">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {categories.map((cat) => (
              <CategoryChip
                key={cat.id}
                label={cat.name}
                active={selectedCategory === cat.slug}
                onPress={() => handleCategoryPress(cat.slug)}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {/* Active filters indicator */}
      {hasFilters ? (
        <View className="mx-4 mb-2 flex-row items-center justify-between">
          <Text className="text-xs text-slate-400">
            {events.length} result{events.length !== 1 ? "s" : ""}
          </Text>
          <TouchableOpacity onPress={clearFilters}>
            <Text className="text-xs text-indigo-400">Clear all</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Results */}
      {isLoading ? (
        <SkeletonList count={5} />
      ) : error ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-slate-400">{error.message}</Text>
          <TouchableOpacity
            onPress={() => queryClient.invalidateQueries({ queryKey: ["events", "search"] })}
            className="mt-4 rounded-lg bg-indigo-600 px-6 py-3"
          >
            <Text className="text-white font-medium">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
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
              onRefresh={() => queryClient.invalidateQueries({ queryKey: ["events", "search"] })}
              tintColor="#6366f1"
            />
          }
          ListEmptyComponent={
            <View className="mt-20 items-center">
              <Text className="text-slate-400">
                {hasFilters ? "No events match your filters." : "No events available."}
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </View>
  );
}
