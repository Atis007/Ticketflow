import AuthForm from "../components/AuthForm";

const HERO_IMAGE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDlnENu-52-qOkmUatRw-9SHQpqEyt15dkayo_of32mnK7O01p_ETEWBROTLWXdPfk5zKsxB7lqzFc47j-XHGTaNvld57_DMHkFad11ReKwKTWo4mooMrl0L-_IOc4RGzsVJeu7EN0KiAeeynhq2FzUmJCEKCBbVDUPTno1ESfIGnksOIFJ68u1qXcgiimaRvkJvLlInsvhT_HLkD-TJqfPovuGRCQxZSZMn-153U0iv87tWgMbD-d3OSNsBuf_v3wO-4LfzOaDFUmb";

export default function RegisterPage() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute top-0 right-[-15%] h-105 w-105 rounded-full bg-[#7c3bed]/20 blur-[150px]"></div>
      <div className="pointer-events-none absolute bottom-[-10%] left-[-15%] h-80 w-80 rounded-full bg-accent-cyan/15 blur-[140px]"></div>

      <div className="relative z-10 w-full overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#030819]/80 backdrop-blur-xl shadow-[0_40px_120px_rgba(2,6,23,0.55)]">
        <div className="flex min-h-180 flex-col lg:flex-row">
          <aside className="relative hidden w-full overflow-hidden border-b border-white/10 bg-[#050A1A] lg:flex lg:w-1/2">
            <div
              className="absolute inset-0 opacity-60 mix-blend-overlay"
              style={{
                backgroundImage: `url(${HERO_IMAGE_URL})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
            <div className="absolute inset-0 bg-linear-to-t from-background via-background-dark/60 to-transparent"></div>
            <div className="relative z-10 flex w-full flex-col justify-end p-16 text-left">
              <div className="mb-10 text-white">
                <div className="mb-6 flex size-12 items-center justify-center rounded-full border border-white/20 bg-[#7c3bed]/10 text-[#7c3bed] backdrop-blur-sm">
                  <span
                    className="material-symbols-outlined text-2xl"
                    aria-hidden="true"
                  >
                    auto_awesome
                  </span>
                </div>
                <h2 className="font-display text-4xl font-bold leading-tight drop-shadow-[0_0_25px_rgba(124,59,237,0.45)]">
                  One account.
                  <br />
                  <span className="bg-linear-to-r from-[#7c3bed] to-accent-cyan bg-clip-text text-transparent">
                    Multiple roles.
                  </span>
                </h2>
                <p className="mt-4 max-w-md text-lg text-slate-300">
                  Access events, organize your own, and manage everything in one
                  place.
                </p>
              </div>
            </div>
          </aside>

          <div className="relative w-full bg-background-dark/90">
            <div className="flex items-center justify-center px-6 py-12">
              <div className="w-full max-w-120">
                <AuthForm
                  mode="register"
                  headerText="Create Account"
                  headerParagraph="Enter your details to access the platform."
                  labelFullName="Full Name"
                  iconFullName="person"
                  idFullName="register-fullname"
                  nameFullName="fullname"
                  typeFullName="text"
                  placeholderFullName="e.g. Alex Sterling"
                  labelEmail="Email Address"
                  iconEmail="mail"
                  idEmail="register-email"
                  nameEmail="email"
                  typeEmail="email"
                  placeholderEmail="name@example.com"
                  labelPassword="Password"
                  iconPassword="lock"
                  idPassword="register-password"
                  namePassword="password"
                  placeholderPassword="Enter your password"
                  labelPasswordAgain="Confirm Password"
                  idPasswordAgain="register-password-confirm"
                  namePasswordAgain="passwordConfirmation"
                  placeholderPasswordAgain="Confirm your password"
                  buttonText="Get Started"
                  buttonIcon="arrow_forward"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
