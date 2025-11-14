export default function AvatarGroup({ users = [], size = 6, max = 3 }) {
  const shown = users.slice(0, max)
  const extra = users.length - shown.length
  const dim = `${size * 4}px`
  return (
    <div className="flex -space-x-2">
      {shown.map((u, i) => (
        <img
          key={i}
          src={u?.avatar || `https://api.dicebear.com/9.x/initials/svg?seed=${u?.name || 'U'}`}
          alt=""
          className="rounded-full ring-2 ring-white"
          style={{ width: dim, height: dim }}
        />
      ))}
      {extra > 0 && (
        <div
          className="rounded-full bg-gray-100 text-gray-600 text-[10px] flex items-center justify-center ring-2 ring-white"
          style={{ width: dim, height: dim }}
        >+{extra}</div>
      )}
    </div>
  )}
