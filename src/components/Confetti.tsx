import { useEffect, useState } from 'react'

export function Confetti({ active }: { active: boolean }) {
  const [pieces, setPieces] = useState<{ id: number; x: number; color: string; delay: number }[]>(
    [],
  )

  useEffect(() => {
    if (active) {
      const colors = ['#6366F1', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6']
      const newPieces = Array.from({ length: 70 }).map((_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 1.5,
      }))
      setPieces(newPieces)
    } else {
      setPieces([])
    }
  }, [active])

  if (!active) return null

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
        .animate-confetti {
          animation: confetti-fall forwards ease-out;
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {pieces.map((p) => (
          <div
            key={p.id}
            className="absolute top-[-20px] w-2.5 h-4 rounded-sm animate-confetti"
            style={{
              left: `${p.x}%`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>
    </>
  )
}
