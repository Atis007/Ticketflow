export default function EventTicketCard({ tickets }) {
  return (
    <div className="bg-surface-dark/50 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-xl">
      <h3 className="text-white text-xl font-bold mb-6">Select Tickets</h3>

      {tickets.map((ticket) => (
        <div key={ticket.id} className="mb-4 last:mb-6">
          <label
            className={`relative flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-colors group ${
              ticket.featured
                ? "border-primary/30 bg-background-dark hover:border-primary"
                : "border-white/10 bg-background-dark hover:border-primary"
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="radio"
                name="ticket-type"
                defaultChecked={ticket.featured}
                className="mt-1 bg-transparent border-text-muted text-primary focus:ring-primary focus:ring-offset-background-dark"
              />
              <div>
                <div className="text-white font-bold group-hover:text-primary transition-colors">
                  {ticket.name}
                </div>
                <div className="text-text-muted text-sm mt-1">{ticket.description}</div>
              </div>
            </div>
            <div className="text-white font-bold text-lg">{ticket.price}</div>
          </label>
        </div>
      ))}

      <div className="flex items-center justify-between mb-4 border-t border-white/10 pt-6">
        <span className="text-white font-medium">Quantity</span>
        <div className="flex items-center gap-4 bg-background-dark rounded-full px-2 py-1 border border-white/10">
          <button className="size-8 rounded-full flex items-center justify-center text-text-muted hover:bg-white/10 hover:text-white transition-colors" aria-label="Decrease quantity">
            <span className="material-symbols-outlined text-sm">remove</span>
          </button>
          <span className="text-white font-bold w-4 text-center">2</span>
          <button className="size-8 rounded-full flex items-center justify-center text-text-muted hover:bg-white/10 hover:text-white transition-colors" aria-label="Increase quantity">
            <span className="material-symbols-outlined text-sm">add</span>
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <span className="text-text-muted">Total</span>
        <span className="text-white text-2xl font-bold">$130</span>
      </div>
      <button className="w-full bg-primary hover:bg-color-hover hover:shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.4)] transition-all duration-300 text-white font-bold py-4 rounded-full text-lg tracking-wide flex items-center justify-center gap-2">
        <span className="material-symbols-outlined">confirmation_number</span>
        Checkout
      </button>
      <p className="text-center text-text-muted text-xs mt-4 flex items-center justify-center gap-1">
        <span className="material-symbols-outlined text-xs">lock</span>
        Secure transaction powered by Ticketflow
      </p>
    </div>
  );
}
