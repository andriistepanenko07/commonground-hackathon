// Shared avatar helpers. Used by ClusterPreview, ClusterAvatars, FollowupPicker —
// any place we render member circles. Keeps the gradient hashing consistent across screens.

export function initials(name: string): string {
  const t = name.trim();
  return t ? t[0].toUpperCase() : "?";
}

// Maps a user id to one of the six warm gradient classes defined in globals.css
// (avatar-grad-0 … avatar-grad-5). Stable per id, so the same user is always the same colour.
export function avatarClass(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return `avatar-grad-${h % 6}`;
}
