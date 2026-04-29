type Variant = 'card' | 'hero' | 'line' | 'chip' | 'text'

interface Props {
  variant?: Variant
  width?: string | number
  height?: string | number
  count?: number
  style?: React.CSSProperties
}

const presets: Record<Variant, { width: string; height: string; radius?: string }> = {
  card:  { width: '100%',  height: '220px', radius: 'var(--radius-lg)' },
  hero:  { width: '100%',  height: '360px', radius: 'var(--radius-lg)' },
  line:  { width: '100%',  height: '12px' },
  chip:  { width: '64px',  height: '24px' },
  text:  { width: '60%',   height: '14px' },
}

export default function Skeleton({ variant = 'line', width, height, count = 1, style }: Props) {
  const preset = presets[variant]
  const items = Array.from({ length: count })
  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            width: width ?? preset.width,
            height: height ?? preset.height,
            borderRadius: preset.radius,
            marginBottom: count > 1 && i < count - 1 ? '8px' : 0,
            ...style,
          }}
        />
      ))}
    </>
  )
}
