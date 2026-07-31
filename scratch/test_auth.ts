import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://quldwrzfdxjopnzwjqrq.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9rjNi9xapHs0EfDH7oiYjQ_BThU5tkE";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  global: {
    fetch: createSupabaseFetch(SUPABASE_PUBLISHABLE_KEY),
  },
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function runTest() {
  const timestamp = Date.now();
  const testEmail = `shipsmart.test.${timestamp}@gmail.com`;
  const testPassword = "ShipSmart#2026!Secured";

  console.log("==========================================");
  console.log("TESTING NEW SUPABASE PROJECT: quldwrzfdxjopnzwjqrq");
  console.log("==========================================");
  console.log("URL:", SUPABASE_URL);
  console.log("Key:", SUPABASE_PUBLISHABLE_KEY);

  console.log("\n--- STEP 1: SIGNING UP WITH GMAIL EMAIL ---");
  console.log("Email:", testEmail);
  const signUpRes = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
  });

  console.log("SignUp User ID:", signUpRes.data.user?.id);
  console.log(
    "SignUp Session:",
    signUpRes.data.session ? "CREATED IMMEDIATELY (Email Confirm OFF)" : "NULL (Email Confirm ON)",
  );
  console.log("SignUp Error:", signUpRes.error);

  console.log("\n--- STEP 2: TRYING TO SIGN IN ---");
  const signInRes = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  console.log("SignIn User ID:", signInRes.data.user?.id);
  console.log(
    "SignIn Session:",
    signInRes.data.session ? "SUCCESS - ACCESS TOKEN CREATED" : "NULL",
  );
  console.log("SignIn Error:", signInRes.error);
}

runTest();
