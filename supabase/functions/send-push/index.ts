import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type PushOutboxRow = {
  id: string;
  user_id: string;
  notification_id: string | null;
  admin_notification_id: string | null;
  title: string;
  body: string | null;
  payload: Record<string, unknown> | null;
};

type PushSubscriptionRow = {
  endpoint: string;
  subscription: webpush.PushSubscription;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
const appOrigin = Deno.env.get("APP_ORIGIN") ?? "";

const supabase = createClient(supabaseUrl, serviceRoleKey);

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
}

function targetUrl(payload: Record<string, unknown> | null) {
  if (!appOrigin) return "/?notifications=1";
  const movementId = typeof payload?.movementId === "string" ? payload.movementId : "";
  if (movementId) return `${appOrigin}/?movementId=${encodeURIComponent(movementId)}`;
  return `${appOrigin}/?notifications=1`;
}

Deno.serve(async () => {
  if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return Response.json({ error: "Missing Supabase or VAPID environment variables." }, { status: 500 });
  }

  const { data: outbox, error } = await supabase
    .from("notification_push_outbox")
    .select("id,user_id,notification_id,admin_notification_id,title,body,payload")
    .is("sent_at", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let failed = 0;

  for (const item of (outbox ?? []) as PushOutboxRow[]) {
    const { data: subscriptions, error: subscriptionError } = await supabase
      .from("user_push_subscriptions")
      .select("endpoint,subscription")
      .eq("user_id", item.user_id)
      .is("revoked_at", null);

    if (subscriptionError) {
      failed += 1;
      await supabase.from("notification_push_outbox").update({ error: subscriptionError.message }).eq("id", item.id);
      continue;
    }

    const payload = JSON.stringify({
      ...(item.payload ?? {}),
      title: item.title,
      body: item.body ?? "",
      url: targetUrl(item.payload),
      notificationId: item.notification_id ?? item.admin_notification_id,
    });

    try {
      await Promise.all(
        ((subscriptions ?? []) as PushSubscriptionRow[]).map(async (subscription) => {
          try {
            await webpush.sendNotification(subscription.subscription, payload);
          } catch (pushError) {
            const statusCode = typeof pushError === "object" && pushError && "statusCode" in pushError
              ? Number(pushError.statusCode)
              : 0;
            if (statusCode === 404 || statusCode === 410) {
              await supabase
                .from("user_push_subscriptions")
                .update({ revoked_at: new Date().toISOString() })
                .eq("endpoint", subscription.endpoint);
            }
            throw pushError;
          }
        }),
      );
      await supabase.from("notification_push_outbox").update({ sent_at: new Date().toISOString(), error: null }).eq("id", item.id);
      sent += 1;
    } catch (pushError) {
      failed += 1;
      await supabase
        .from("notification_push_outbox")
        .update({ error: pushError instanceof Error ? pushError.message : "Push send failed" })
        .eq("id", item.id);
    }
  }

  return Response.json({ processed: outbox?.length ?? 0, sent, failed });
});
