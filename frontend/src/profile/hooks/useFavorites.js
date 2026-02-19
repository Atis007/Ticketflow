import { useQuery } from "@tanstack/react-query";

const SAMPLE_FAVORITES = [
  {
    id: "fav-1",
    title: "Neon Nights Music Festival",
    date: "2026-05-18T19:30:00Z",
    location: "Belgrade Arena",
    imageUrl: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80",
    eventPath: "/events/music-festival/neon-nights-music-festival",
  },
  {
    id: "fav-2",
    title: "Tech Future Summit",
    date: "2026-06-03T09:00:00Z",
    location: "Sava Center",
    imageUrl: "https://images.unsplash.com/photo-1551818255-e6e10975bc17?auto=format&fit=crop&w=1200&q=80",
    eventPath: "/events/tech-conference/tech-future-summit",
  },
];

export function useFavorites(enabled = true) {
  return useQuery({
    queryKey: ["profile", "favorites"],
    enabled,
    queryFn: async () => SAMPLE_FAVORITES,
    staleTime: 60 * 1000,
  });
}
