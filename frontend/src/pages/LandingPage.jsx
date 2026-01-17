import { useAuth } from "@/auth/context/AuthContext";

export default function LandingPage() {
  const { isAuthenticated, user } = useAuth();

  const paragraphText = isAuthenticated
    ? "Ready to discover your next experience?"
    : "Discover the best experiences in your city. Everything in one place, available with a single click.";

  return (
    <div className="max-w-7xl mx-auto w-full">
      <div className="flex flex-col items-center justify-center text-center gap-10 max-w-4xl mx-auto">
        <div className="flex flex-col gap-6 items-center">
          <h1 className="font-display font-black text-5xl sm:text-6xl lg:text-7xl leading-[1.1] tracking-tight text-white">
            {isAuthenticated ? (
              user?.fullname ? (
                `Welcome back, ${user.fullname}`
              ) : (
                "Welcome back!"
              )
            ) : (
              <>
                Tickets Quickly, Smoothly, Reliably.
                <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-accent-purple via-accent-cyan to-[#2bee79]">
                  Your Journey Starts Here.
                </span>
              </>
            )}
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl font-body leading-relaxed">
            {paragraphText}
          </p>
        </div>
      </div>
    </div>
  );
}
