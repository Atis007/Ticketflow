export default function AuthSocial() {
  return (
    <>
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="h-px flex-1 bg-white/15"></span>
        <span className="tracking-[0.3em] uppercase">Or continue with</span>
        <span className="h-px flex-1 bg-white/15"></span>
      </div>

      <div className="grid place-items-center">
        <button
          type="button"
          className="flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-white hover:bg-white/10"
        >
          Google
        </button>
      </div>
    </>
  );
}
