import React from 'react'
import { createPortal } from 'react-dom'

export default function Dropdown({ value, options = [], onChange = () => {}, display, disabled = false, className = '' }) {
  const [open, setOpen] = React.useState(false)
  const btnRef = React.useRef(null)
  const [menuStyle, setMenuStyle] = React.useState({})

  React.useEffect(() => {
    function onDoc(e){ if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false) }
    function onEsc(e){ if (e.key === 'Escape') setOpen(false) }
    function onScroll(){ if (open) positionMenu() }
    document.addEventListener('click', onDoc)
    window.addEventListener('keydown', onEsc)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('click', onDoc)
      window.removeEventListener('keydown', onEsc)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  const label = (typeof display === 'function' ? display(value) : (options.find(o=>o.value===value)?.label ?? value)) || ''
  const btnCls = `h-9 px-3 rounded-lg border border-default bg-white text-sm inline-flex items-center gap-2 hover:bg-gray-50 shadow-sm ${className}`

  function positionMenu(){
    const el = btnRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const menuMinWidth = Math.max(160, rect.width)
    const estimatedHeight = 280
    const spaceBelow = window.innerHeight - rect.bottom
    const placeAbove = spaceBelow < estimatedHeight && rect.top > estimatedHeight / 2
    const top = placeAbove ? (rect.top - 8) : (rect.bottom + 8)
    const alignRight = rect.right > window.innerWidth / 2
    const style = { position: 'fixed', minWidth: `${menuMinWidth}px`, zIndex: 1000 }
    if (alignRight) {
      Object.assign(style, { right: `${Math.max(8, window.innerWidth - rect.right)}px` })
    } else {
      Object.assign(style, { left: `${Math.max(8, rect.left)}px` })
    }
    Object.assign(style, placeAbove ? { bottom: `${window.innerHeight - top}px` } : { top: `${top}px` })
    setMenuStyle(style)
  }

  React.useEffect(() => { if (open) positionMenu() }, [open])

  const menu = open ? (
    <div style={menuStyle} className="bg-white border border-default rounded-lg shadow-lg py-1 max-h-60 overflow-auto">
      {options.map(opt => {
        const selected = value===opt.value
        return (
          <button
            key={opt.value}
            onClick={()=>{ onChange(opt.value); setOpen(false) }}
            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between ${selected ? 'bg-indigo-50 text-indigo-600' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            <span>{opt.label}</span>
            {selected && (
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M5 10.5l3.5 3L15 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
            )}
          </button>
        )
      })}
    </div>
  ) : null

  return (
    <div className="relative inline-block">
      <button ref={btnRef} type="button" onClick={()=>!disabled && setOpen(o=>!o)} disabled={disabled} className={btnCls}>
        <span className={disabled? 'text-gray-400' : ''}>{label}</span>
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className={`transition-transform ${open?'rotate-180':''}`}><path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      {open ? createPortal(menu, document.body) : null}
    </div>
  )
}
