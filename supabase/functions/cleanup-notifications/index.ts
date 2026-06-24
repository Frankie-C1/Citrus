import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, serviceRoleKey);

Deno.serve(async () => {
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Missing Supabase environment variables." }, { status: 500 });
  }

  const { error } = await supabase.rpc("cleanup_old_notifications");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({
    ok: true,
    normalRetention: "24 hours",
    adminRetention: "3 months",
  });
});
