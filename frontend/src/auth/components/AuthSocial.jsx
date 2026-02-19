export default function AuthSocial() {
  return (
    <>
      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-strong"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-surface-dark px-2 text-text-muted-strong">Or continue with</span>
        </div>
      </div>

      <div className="flex gap-4 justify-center">
        <button
          type="button"
          className="group flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-strong bg-background-dark px-4 py-2 transition-colors hover:border-accent-purple/50"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
            alt="Google"
            className="h-5 w-5 opacity-80 transition-opacity group-hover:opacity-100"
          />
        </button>
        <button
          type="button"
          className="group flex flex-1 items-center justify-center gap-2 rounded-lg border border-border-strong bg-background-dark px-4 py-2 transition-colors hover:border-accent-purple/50"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg"
            alt="Apple"
            className="h-5 w-5 invert opacity-80 transition-opacity group-hover:opacity-100"
          />
        </button>
      </div>
    </>
  );
}
