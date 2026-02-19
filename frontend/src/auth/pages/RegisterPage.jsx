import AuthForm from "../components/AuthForm";

const HERO_IMAGE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDlnENu-52-qOkmUatRw-9SHQpqEyt15dkayo_of32mnK7O01p_ETEWBROTLWXdPfk5zKsxB7lqzFc47j-XHGTaNvld57_DMHkFad11ReKwKTWo4mooMrl0L-_IOc4RGzsVJeu7EN0KiAeeynhq2FzUmJCEKCBbVDUPTno1ESfIGnksOIFJ68u1qXcgiimaRvkJvLlInsvhT_HLkD-TJqfPovuGRCQxZSZMn-153U0iv87tWgMbD-d3OSNsBuf_v3wO-4LfzOaDFUmb";

export default function RegisterPage() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute top-0 right-[-15%] h-105 w-105 rounded-full bg-[rgba(var(--color-primary-rgb),0.18)] blur-[150px]"></div>
      <div className="pointer-events-none absolute bottom-[-10%] left-[-15%] h-80 w-80 rounded-full bg-[rgba(var(--color-accent-cyan-rgb),0.12)] blur-[140px]"></div>

      <div className="shadow-auth-shell-lg relative z-10 w-full overflow-hidden rounded-[2.5rem] border border-border-strong bg-[rgba(var(--color-surface-ink-rgb),0.8)] backdrop-blur-xl">
        <div className="flex min-h-180 flex-col lg:flex-row">
          <aside className="relative hidden w-full overflow-hidden border-b border-border-strong bg-surface-dark lg:flex lg:w-1/2">
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
                <div className="mb-6 flex size-12 items-center justify-center rounded-full border border-white/20 bg-[rgba(var(--color-primary-rgb),0.1)] text-primary backdrop-blur-sm">
                  <span
                    className="material-symbols-outlined text-2xl"
                    aria-hidden="true"
                  >
                    auto_awesome
                  </span>
                </div>
                <h2 className="drop-shadow-primary-card font-display text-4xl font-bold leading-tight">
                  One account.
                  <br />
                  <span className="bg-linear-to-r from-primary to-accent-cyan bg-clip-text text-transparent">
                    Multiple roles.
                  </span>
                </h2>
                <p className="mt-4 max-w-md text-lg text-text-soft">
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
