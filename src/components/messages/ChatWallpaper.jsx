/**
 * Theme-aware chat wallpaper. Layers paint via CSS background (scroll,
 * not local) so empty absolute layers still show the pattern.
 */
const LIGHT_SRC = '/images/chat_background_light.png';
const DARK_SRC = '/images/chat_background_dark.png';

export default function ChatWallpaper({ children, className = '' }) {
  return (
    <div
      className={['chat-wallpaper relative flex min-h-0 flex-1 flex-col overflow-hidden', className]
        .filter(Boolean)
        .join(' ')}
      data-chat-wallpaper=""
    >
      <div
        className="chat-wallpaper__layer chat-wallpaper__layer--light"
        style={{ backgroundImage: `url('${LIGHT_SRC}')` }}
        aria-hidden
      />
      <div
        className="chat-wallpaper__layer chat-wallpaper__layer--dark"
        style={{ backgroundImage: `url('${DARK_SRC}')` }}
        aria-hidden
      />
      <div className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-hidden bg-transparent">
        {children}
      </div>
    </div>
  );
}
