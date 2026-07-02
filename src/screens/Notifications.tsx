import type { Movement, Notification, NotificationDetail } from "../types";
import { Icon } from "../components/Icon";

type NotificationsProps = {
  notifications: Notification[];
  detail?: NotificationDetail;
  movements: Movement[];
  isAuthenticated: boolean;
  onBack: () => void;
  onOpenNotification: (notification: Notification) => Promise<void> | void;
  onOpenMovement: (movement: Movement) => void;
  onMarkAllRead: () => void;
  onAuth: () => void;
};

function formatNotificationDate(value?: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function Notifications({
  notifications,
  detail,
  movements,
  isAuthenticated,
  onBack,
  onOpenNotification,
  onOpenMovement,
  onMarkAllRead,
  onAuth,
}: NotificationsProps) {
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  async function openNotification(notification: Notification) {
    await onOpenNotification(notification);
    const movement = notification.movementId
      ? movements.find((item) => item.id === notification.movementId)
      : undefined;
    if (movement) onOpenMovement(movement);
  }

  if (detail) {
    const movement = detail.movement;
    return (
      <div className="screen notifications-screen">
        <header className="notifications-header">
          <button className="home-round-button" type="button" onClick={onBack} aria-label="Zurück">
            <Icon name="chevronRight" size={24} />
          </button>
          <div>
            <span>{detail.typeLabel}</span>
            <h1>{detail.notification.title}</h1>
          </div>
        </header>

        <section className="notification-detail-card">
          <dl>
            <div><dt>Typ</dt><dd>{detail.typeLabel}</dd></div>
            {detail.content ? <div><dt>Inhalt</dt><dd>{detail.content}</dd></div> : null}
            {movement ? <div><dt>Beitrag</dt><dd>{movement.title}</dd></div> : null}
            {detail.actorName || detail.actorEmail ? <div><dt>Nutzer</dt><dd>{[detail.actorName, detail.actorEmail].filter(Boolean).join(" · ")}</dd></div> : null}
            {detail.groupName ? <div><dt>Gruppe</dt><dd>{detail.groupName}</dd></div> : null}
            {detail.createdAt ? <div><dt>Zeitpunkt</dt><dd>{formatNotificationDate(detail.createdAt)}</dd></div> : null}
          </dl>
          {movement ? (
            <button className="primary-button muted" type="button" onClick={() => onOpenMovement(movement)}>
              Beitrag öffnen
            </button>
          ) : null}
          {detail.adminActions?.length ? (
            <div className="notification-admin-actions">
              {detail.adminActions.map((action) => <span key={action}>{action}</span>)}
            </div>
          ) : null}
        </section>
      </div>
    );
  }

  return (
    <div className="screen notifications-screen">
      <header className="notifications-header">
        <button className="home-round-button" type="button" onClick={onBack} aria-label="Zurück">
          <Icon name="chevronRight" size={24} />
        </button>
        <div>
          <span>Aktuell</span>
          <h1>Benachrichtigungen</h1>
        </div>
        {unreadCount ? (
          <button className="notification-read-button" type="button" onClick={onMarkAllRead}>
            Alle gelesen
          </button>
        ) : null}
      </header>

      {!isAuthenticated ? (
        <section className="notification-empty">
          <Icon name="bell" size={34} />
          <strong>Melde dich an.</strong>
          <span>Dann erscheinen hier echte Benachrichtigungen aus deinem Konto.</span>
          <button className="primary-button" type="button" onClick={onAuth}>
            Anmelden
          </button>
        </section>
      ) : notifications.length ? (
        <div className="notification-list">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              className={`notification-card ${notification.isRead ? "" : "unread"}`}
              type="button"
              onClick={() => openNotification(notification)}
            >
              <span className="notification-dot" />
              <div>
                <strong>{notification.title}</strong>
                {notification.body ? <p>{notification.body}</p> : null}
                <small>{[notification.isAdminNotification ? "Admin" : null, notification.type || notification.targetType, formatNotificationDate(notification.createdAt)].filter(Boolean).join(" · ")}</small>
              </div>
              <Icon name="chevronRight" size={20} />
            </button>
          ))}
        </div>
      ) : (
        <section className="notification-empty">
          <Icon name="bell" size={34} />
          <strong>Keine Benachrichtigungen.</strong>
          <span>Es werden nur echte ungelesene oder gelesene Meldungen aus Supabase angezeigt.</span>
        </section>
      )}
    </div>
  );
}
