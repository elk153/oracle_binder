import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import useMobileNavbar from "../navigation/useMobileNavbar.ts";
import { INFO_MS, type AppNotification } from "./notificationList.ts";
import "./NotificationStack.css";

type NotificationStackProps = {
  notifications: AppNotification[];
  onUndo: (id: string) => void;
  onDismiss: (id: string) => void;
  onExpire: (id: string) => void;
};

/**
 * The app-wide notification stack (D-080): newest at the bottom. It follows
 * the navigation bar, not the viewport size: bottom-right while the desktop
 * navbar is shown, bottom center just above the mobile bar while that one
 * is shown.
 */
export default function NotificationStack({
  notifications,
  onUndo,
  onDismiss,
  onExpire,
}: NotificationStackProps) {
  const mobileNavbar = useMobileNavbar();
  if (notifications.length === 0) return null;

  const style = mobileNavbar.shown
    ? ({ "--notification-stack-clearance": `${mobileNavbar.clearance}px` } as CSSProperties)
    : undefined;

  return (
    <section
      className={`notification-stack${
        mobileNavbar.shown ? " notification-stack--above-mobile-nav" : ""
      }`}
      style={style}
      aria-label="Notifications"
    >
      <ol className="notification-stack__list">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onUndo={onUndo}
            onDismiss={onDismiss}
            onExpire={onExpire}
          />
        ))}
      </ol>
    </section>
  );
}

type NotificationItemProps = {
  notification: AppNotification;
  onUndo: (id: string) => void;
  onDismiss: (id: string) => void;
  onExpire: (id: string) => void;
};

/**
 * One notification and its own timer (D-080 points 4 and 8):
 * - info: 5 s, then it expires;
 * - undo: no timer here; its undo window (8 s) ends it, see the provider;
 * - error: stays until dismissed.
 * While the pointer is over it or focus is inside it, its countdown pauses;
 * for an undo notice the undo window itself pauses.
 */
function NotificationItem({ notification, onUndo, onDismiss, onExpire }: NotificationItemProps) {
  const { id, kind, text, undoWindow, link } = notification;
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  // Time left on the info countdown; it shrinks each time a run is paused.
  const infoLeft = useRef(INFO_MS);

  useEffect(() => {
    if (kind !== "info" || paused) return;
    const startedAt = Date.now();
    const timer = setTimeout(() => onExpire(id), infoLeft.current);
    return () => {
      clearTimeout(timer);
      infoLeft.current = Math.max(0, infoLeft.current - (Date.now() - startedAt));
    };
  }, [id, kind, paused, onExpire]);

  useEffect(() => {
    if (kind !== "undo" || !undoWindow) return;
    if (paused) undoWindow.pause();
    else undoWindow.resume();
  }, [kind, paused, undoWindow]);

  return (
    <li
      className={`notification-stack__item notification-stack__item--${kind}`}
      role={kind === "error" ? "alert" : "status"}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event) => {
        // Only when focus leaves the notification, not between its buttons.
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
    >
      <span className="notification-stack__text">{text}</span>
      {link && (
        <Link className="notification-stack__action" to={link.to} onClick={() => onDismiss(id)}>
          {link.label}
        </Link>
      )}
      {kind === "undo" && (
        <button type="button" className="notification-stack__action" onClick={() => onUndo(id)}>
          Undo
        </button>
      )}
      <button type="button" className="notification-stack__action" onClick={() => onDismiss(id)}>
        Dismiss
      </button>
    </li>
  );
}
