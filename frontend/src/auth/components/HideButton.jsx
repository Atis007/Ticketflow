export default function HideButton({ isRevealed, reveal }) {
  return (
    <button
      type="button"
      className="material-symbols-outlined text-text-muted-strong hover:text-accent-cyan transition-colors"
      onClick={() => reveal((prev) => !prev)}
    >
      {isRevealed ? "visibility" : "visibility_off"}
    </button>
  );
}
