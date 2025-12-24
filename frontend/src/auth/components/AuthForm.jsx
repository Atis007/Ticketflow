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
        className="mt-2 h-12 rounded-full bg-[#7c3bed] text-white font-bold"
      >
        {mode === "login" ? "Log In" : `Get Started ${props.buttonIcon}`}
      </button>

      <AuthSocial />
      <AuthFooter mode={mode} />
    </form>
  );
}
