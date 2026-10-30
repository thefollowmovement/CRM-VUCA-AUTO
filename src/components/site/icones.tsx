/** Logo WhatsApp simplifié (bulle + combiné), à la couleur du texte. */
export function IconeWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} focusable="false">
      <path d="M12 2.2a9.8 9.8 0 0 0-8.4 14.8L2.2 21.8l4.9-1.3A9.8 9.8 0 1 0 12 2.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path
        d="M8.7 7.4c.2-.4.5-.4.8-.4h.6c.2 0 .4 0 .6.4l.8 1.9c.1.2.1.5 0 .7l-.5.7c-.1.2-.2.4 0 .6.6 1 1.4 1.8 2.4 2.4.2.1.4.1.6 0l.7-.6c.2-.2.4-.2.7-.1l1.8.9c.3.1.4.3.4.5v.6c0 .3-.1.6-.4.8-.6.5-1.4.7-2.2.5-2.7-.7-4.9-2.9-5.7-5.6-.2-.8 0-1.6.4-2.3Z"
        fill="currentColor"
      />
    </svg>
  );
}
