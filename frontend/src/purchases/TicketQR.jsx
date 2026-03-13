import { QRCodeSVG } from "qrcode.react";

export default function TicketQR({ qrCode, ticketNumber, eventTitle, seatInfo }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-white/10 bg-background-dark p-4 print:border-0 print:shadow-none">
      <div className="print:block hidden text-center">
        {eventTitle && <p className="text-sm font-bold text-black">{eventTitle}</p>}
        {seatInfo && <p className="text-xs text-gray-600">{seatInfo}</p>}
      </div>

      <div className="print:hidden text-center">
        {eventTitle && <p className="text-xs font-semibold text-white">{eventTitle}</p>}
        {seatInfo && <p className="text-[10px] text-text-muted">{seatInfo}</p>}
      </div>

      <QRCodeSVG
        value={qrCode}
        size={160}
        bgColor="transparent"
        fgColor="#ffffff"
        level="M"
        className="print:[color-scheme:light] print:[&_path]:fill-black"
      />

      <p className="text-xs font-medium text-text-soft print:text-black">
        Ticket #{ticketNumber}
      </p>

      <button
        type="button"
        onClick={() => window.print()}
        className="print:hidden inline-flex items-center gap-1 text-xs text-text-muted hover:text-white transition-colors mt-1"
      >
        <span className="material-symbols-outlined text-sm">print</span>
        Print
      </button>
    </div>
  );
}
