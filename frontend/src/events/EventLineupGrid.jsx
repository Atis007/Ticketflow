export default function EventLineupGrid({ lineup }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
      {lineup.map((artist) => (
        <div key={artist.name} className="flex flex-col items-center gap-3 group cursor-pointer">
          <div className="w-full aspect-square rounded-full overflow-hidden border-2 border-transparent group-hover:border-primary transition-all duration-300 relative">
            <img
              src={artist.image}
              alt={artist.name}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
          </div>
          <div className="text-center">
            <h3 className="text-white font-bold group-hover:text-primary transition-colors">{artist.name}</h3>
            <p className="text-text-muted text-xs">{artist.role}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
