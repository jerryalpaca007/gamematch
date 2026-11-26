import { createClient } from "@supabase/supabase-js";

// The client for accounts and everything that belongs to a user. It keeps the
// session in the browser and picks it up from the link after Google sign-in or
// a password-reset email. Passwords are handled by Supabase, never stored by us.
export const account = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
