import { useParams } from "react-router-dom";

export default function EventsPage() {
  const { category } = useParams();

  // fetch: /api/events?category={category}

  return (
    <div>
      <h1 className="text-2xl font-bold capitalize">{category}</h1>
      {/* Event cards */}
    </div>
  );
}
