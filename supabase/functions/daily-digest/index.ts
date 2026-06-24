import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type QueueRow = {
  id: string;
  user_id: string;
  category: string;
  title: string;
  body: string | null;
  movement_id: string | null;
  target_type: string | null;
  target_id: string | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, serviceRoleKey);

function digestBody(items: QueueRow[]) {
  const categories = new Map<string, number>();
  for (const item of items) categories.set(item.category, (categories.get(item.category) ?? 0) + 1);
  return [...categories.entries()]
    .map(([category, count]) => `${count} ${category.replaceAll("_", " ")}`)
    .join(" · ");
}

Deno.serve(async () => {
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Missing Supabase environment variables." }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("notification_daily_queue")
    .select("id,user_id,category,title,body,movement_id,target_type,target_id")
    .is("processed_at", null)
    .lte("digest_date", new Date().toISOString().slice(0, 10))
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const grouped = new Map<string, QueueRow[]>();
  for (const row of (data ?? []) as QueueRow[]) {
    grouped.set(row.user_id, [...(grouped.get(row.user_id) ?? []), row]);
  }

  let created = 0;
  for (const [userId, items] of grouped.entries()) {
    const firstMovement = items.find((item) => item.movement_id)?.movement_id ?? null;
    const title = "Deine tägliche Citrus-Zusammenfassung";
    const body = digestBody(items) || `${items.length} neue Ereignisse`;

    const { data: notification, error: insertError } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        movement_id: firstMovement,
        type: "daily_digest",
        category: "daily_digest",
        title,
        body,
        target_type: firstMovement ? "movement" : "notifications",
        target_id: firstMovement,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      })
      .select("id")
      .single();

    if (insertError) continue;

    await supabase.from("notification_push_outbox").insert({
      user_id: userId,
      notification_id: notification.id,
      title,
      body,
      payload: {
        notificationId: notification.id,
        movementId: firstMovement,
        targetType: firstMovement ? "movement" : "notifications",
        category: "daily_digest",
      },
    });

    await supabase
      .from("notification_daily_queue")
      .update({ processed_at: new Date().toISOString() })
      .in("id", items.map((item) => item.id));

    created += 1;
  }

  return Response.json({ users: grouped.size, notificationsCreated: created });
});
