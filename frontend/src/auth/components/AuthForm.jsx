import AuthFields from "./AuthFields";
import AuthSocial from "./AuthSocial";
import AuthFooter from "./AuthFooter";

export default function AuthForm({ mode, ...props }) {
  const handleSubmit = (event) => {
    event.preventDefault();
    // Handle form submission logic here
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <AuthFields mode={mode} {...props} />

      <button
        type="submit"
        className="mt-2 h-12 rounded-full bg-[#7c3bed] text-white font-bold flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 ease-out
    transform hover:-translate-y-0.5
    hover:shadow-[0_0_30px_rgba(124,59,237,0.55)]
    active:translate-y-0
    group"
      >
        {mode === "login" ? (
          <span className="transition-all duration-300 ease-out group-hover:tracking-wide">
            Log In
          </span>
        ) : (
          <>
            <span className="transition-all duration-300 ease-out group-hover:tracking-wide">
              {props.buttonText}
            </span>
            <span className="material-symbols-outlined text-xl transition-transform duration-300 ease-out group-hover:translate-x-1">
              {props.buttonIcon}
            </span>
          </>
        )}
      </button>

      <AuthSocial />
      <AuthFooter mode={mode} />
    </form>
  );
}
