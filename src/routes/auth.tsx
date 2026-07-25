import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Mail, Lock, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth-context";

const searchSchema = z.object({
  mode: z.enum(["login", "signup", "forgot"]).optional(),
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — Ship Smart" },
      { name: "description", content: "Sign in or create your Ship Smart account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(6, "At least 6 characters").max(128);

function AuthPage() {
  const search = useSearch({ from: "/auth" });
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">(search.mode ?? "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // If already signed in, bounce to dashboard
  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [loading, session, navigate]);

  const redirectTo = search.redirect ?? "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "forgot") {
        const parsed = emailSchema.safeParse(email);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Invalid email");
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your inbox for a reset link");
        setMode("login");
        return;
      }

      const emailParsed = emailSchema.safeParse(email);
      const passParsed = passwordSchema.safeParse(password);
      if (!emailParsed.success) {
        toast.error(emailParsed.error.issues[0]?.message ?? "Invalid email");
        return;
      }
      if (!passParsed.success) {
        toast.error(passParsed.error.issues[0]?.message ?? "Invalid password");
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: emailParsed.data,
          password: passParsed.data,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created! Redirecting…");
        navigate({ to: redirectTo, replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailParsed.data,
          password: passParsed.data,
        });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: redirectTo, replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogle() {
    setSubmitting(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
        setSubmitting(false);
        return;
      }
      if (result.redirected) return; // browser redirects away
      // popup returned tokens; session is set
      navigate({ to: redirectTo, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: "var(--gradient-radial)" }}
      />
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        <div className="rounded-2xl surface p-8 shadow-elevated">
          <div className="flex items-center gap-2 mb-6">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand">
              <Sparkles className="h-4 w-4 text-brand-foreground" />
            </div>
            <span className="text-lg font-semibold">Ship Smart</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signup"
              ? "Create your account"
              : mode === "forgot"
                ? "Reset your password"
                : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Start your 14-day free trial. No credit card required."
              : mode === "forgot"
                ? "We'll email you a secure reset link."
                : "Sign in to continue to your dashboard."}
          </p>

          {mode !== "forgot" && (
            <>
              <button
                onClick={handleGoogle}
                disabled={submitting}
                type="button"
                className="mt-6 w-full inline-flex items-center justify-center gap-3 rounded-lg border border-border bg-background/60 px-4 py-3 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                <GoogleIcon />
                Continue with Google
              </button>
              <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" />
                or
                <div className="h-px flex-1 bg-border" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <div className="mt-1.5 relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background/60 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">Password</label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot")}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <div className="mt-1.5 relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background/60 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-brand px-4 py-3 text-sm font-medium text-brand-foreground disabled:opacity-60 transition-opacity hover:opacity-95"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signup"
                ? "Create account"
                : mode === "forgot"
                  ? "Send reset link"
                  : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" && (
              <>
                New to Ship Smart?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="text-foreground font-medium hover:underline"
                >
                  Create an account
                </button>
              </>
            )}
            {mode === "signup" && (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-foreground font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
            {mode === "forgot" && (
              <button
                onClick={() => setMode("login")}
                className="text-foreground font-medium hover:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}


// import { useAuth } from "@/lib/auth-context";
// import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
// import { useEffect, useState } from "react";
// import { z } from "zod";
// import { toast } from "sonner";
// import { ArrowLeft, Loader2, Mail, Lock, Sparkles } from "lucide-react";

// const API_URL = "http://localhost:5000/api/auth";

// const searchSchema = z.object({
//   mode: z.enum(["login", "signup", "forgot"]).optional(),
//   redirect: z.string().optional(),
// });


// export const Route = createFileRoute("/auth")({
//   validateSearch: searchSchema,
//   head: () => ({
//     meta: [
//       { title: "Sign in — Ship Smart" },
//       { name: "description", content: "Sign in or create your Ship Smart account." },
//       { name: "robots", content: "noindex" },
//     ],
//   }),
//   component: AuthPage,
// });


// const emailSchema = z.string().trim().email("Enter a valid email").max(255);
// const passwordSchema = z.string().min(6, "At least 6 characters").max(128);



// function AuthPage() {

//   const search = useSearch({ from: "/auth" });
//   const navigate = useNavigate();
//   const { login } = useAuth();


//   const [mode, setMode] = useState<"login" | "signup" | "forgot">(
//     search.mode ?? "login"
//   );


//   const [name,setName] = useState("");
//   const [email,setEmail] = useState("");
//   const [password,setPassword] = useState("");
//   const [submitting,setSubmitting] = useState(false);



//   // already login check
//   useEffect(()=>{

//     const token = localStorage.getItem("token");

//     if(token){
//       navigate({
//         to:"/dashboard",
//         replace:true
//       });
//     }

//   },[]);



//   const redirectTo = search.redirect ?? "/dashboard";



//   async function handleSubmit(e:React.FormEvent){

//     e.preventDefault();

//     setSubmitting(true);


//     try{


//       const emailParsed = emailSchema.safeParse(email);
//       const passParsed = passwordSchema.safeParse(password);



//       if(!emailParsed.success){

//         toast.error(
//           emailParsed.error.issues[0]?.message
//         );

//         return;
//       }


//       if(!passParsed.success){

//         toast.error(
//           passParsed.error.issues[0]?.message
//         );

//         return;
//       }



//       // SIGNUP

//       if(mode==="signup"){


//         const response = await fetch(
//           `${API_URL}/register`,
//           {
//             method:"POST",
//             headers:{
//               "Content-Type":"application/json"
//             },

//             body:JSON.stringify({

//               name,
//               email,
//               password

//             })
//           }
//         );



//         const data = await response.json();



//         if(!response.ok){

//           throw new Error(
//             data.message || "Registration failed"
//           );

//         }



//         toast.success("Account created");


//         navigate({
//           to:"/auth",
//           search:{
//             mode:"login"
//           }
//         });



//       }



//       // LOGIN

//       else{


//         const response = await fetch(
//           `${API_URL}/login`,
//           {
//             method:"POST",

//             headers:{
//               "Content-Type":"application/json"
//             },

//             body:JSON.stringify({

//               email,
//               password

//             })

//           }
//         );



//         const data = await response.json();



//         if(!response.ok){

//           throw new Error(
//             data.message || "Login failed"
//           );

//         }



//         // save JWT token

//         login(data);

//         toast.success("Welcome back");


//         navigate({
//           to:redirectTo,
//           replace:true
//         });


//       }



//     }

//     catch(err){

//       toast.error(
//         err instanceof Error
//         ? err.message
//         : "Something went wrong"
//       );

//     }

//     finally{

//       setSubmitting(false);

//     }

//   }

//   return (
//     <div className="min-h-screen flex items-center justify-center px-4 py-12">
//       <div
//         className="pointer-events-none absolute inset-0 -z-10"
//         style={{ background: "var(--gradient-radial)" }}
//       />
//       <div className="w-full max-w-md">
//         <Link
//           to="/"
//           className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8"
//         >
//           <ArrowLeft className="h-3.5 w-3.5" /> Back to home
//         </Link>

//         <div className="rounded-2xl surface p-8 shadow-elevated">
//           <div className="flex items-center gap-2 mb-6">
//             <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-brand">
//               <Sparkles className="h-4 w-4 text-brand-foreground" />
//             </div>
//             <span className="text-lg font-semibold">Ship Smart</span>
//           </div>

//           <h1 className="text-2xl font-semibold tracking-tight">
//             {mode === "signup"
//               ? "Create your account"
//               : mode === "forgot"
//                 ? "Reset your password"
//                 : "Welcome back"}
//           </h1>
//           <p className="mt-1 text-sm text-muted-foreground">
//             {mode === "signup"
//               ? "Start your 14-day free trial. No credit card required."
//               : mode === "forgot"
//                 ? "We'll email you a secure reset link."
//                 : "Sign in to continue to your dashboard."}
//           </p>

          
//  <form onSubmit={handleSubmit} className="space-y-4">

//   {mode === "signup" && (
//     <div>
//       <label className="text-xs font-medium text-muted-foreground">
//         Name
//       </label>

//       <div className="mt-1.5">
//         <input
//           type="text"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           required
//           className="w-full rounded-lg border border-input bg-background/60 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
//           placeholder="Enter your name"
//         />
//       </div>
//     </div>
//   )}

//   <div>
//     <label className="text-xs font-medium text-muted-foreground">Email</label>
//     <div className="mt-1.5 relative">
//       <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//       <input
//         type="email"
//         autoComplete="email"
//         required
//         value={email}
//         onChange={(e) => setEmail(e.target.value)}
//         className="w-full rounded-lg border border-input bg-background/60 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
//         placeholder="you@example.com"
//       />
//     </div>
//   </div>

//             {mode !== "forgot" && (
//               <div>
//                 <div className="flex items-center justify-between">
//                   <label className="text-xs font-medium text-muted-foreground">Password</label>
//                   {mode === "login" && (
//                     <button
//                       type="button"
//                       onClick={() => setMode("forgot")}
//                       className="text-xs text-muted-foreground hover:text-foreground"
//                     >
//                       Forgot?
//                     </button>
//                   )}
//                 </div>
//                 <div className="mt-1.5 relative">
//                   <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                   <input
//                     type="password"
//                     autoComplete={mode === "signup" ? "new-password" : "current-password"}
//                     required
//                     minLength={6}
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     className="w-full rounded-lg border border-input bg-background/60 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
//                     placeholder="••••••••"
//                   />
//                 </div>
//               </div>
//             )}

//             <button
//               type="submit"
//               disabled={submitting}
//               className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-brand px-4 py-3 text-sm font-medium text-brand-foreground disabled:opacity-60 transition-opacity hover:opacity-95"
//             >
//               {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
//               {mode === "signup"
//                 ? "Create account"
//                 : mode === "forgot"
//                   ? "Send reset link"
//                   : "Sign in"}
//             </button>
//           </form>

//           <div className="mt-6 text-center text-sm text-muted-foreground">
//             {mode === "login" && (
//               <>
//                 New to Ship Smart?{" "}
//                 <button
//                   onClick={() => setMode("signup")}
//                   className="text-foreground font-medium hover:underline"
//                 >
//                   Create an account
//                 </button>
//               </>
//             )}
//             {mode === "signup" && (
//               <>
//                 Already have an account?{" "}
//                 <button
//                   onClick={() => setMode("login")}
//                   className="text-foreground font-medium hover:underline"
//                 >
//                   Sign in
//                 </button>
//               </>
//             )}
//             {mode === "forgot" && (
//               <button
//                 onClick={() => setMode("login")}
//                 className="text-foreground font-medium hover:underline"
//               >
//                 Back to sign in
//               </button>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


