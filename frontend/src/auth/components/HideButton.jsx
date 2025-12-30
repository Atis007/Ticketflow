export default function HideButton({ isRevealed, reveal }) {
  return (
    <button
      type="button"
      className="material-symbols-outlined text-slate-500"
      onClick={() => reveal((prev) => !prev)}
    >
      {isRevealed ? "visibility" : "visibility_off"}
    </button>
  );
}
