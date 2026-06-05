import { useEffect, useRef } from 'react'

export default function ThreeDMusicVisualizer({ isPlaying = false, speedMultiplier = 1 }) {
  const canvasRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId
    let width = (canvas.width = canvas.parentElement.clientWidth || 800)
    let height = (canvas.height = canvas.parentElement.clientHeight || 500)

    // Handle resize
    const handleResize = () => {
      if (canvas && canvas.parentElement) {
        width = canvas.width = canvas.parentElement.clientWidth
        height = canvas.height = canvas.parentElement.clientHeight
      }
    }
    window.addEventListener('resize', handleResize)

    // Track mouse
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current.targetX = ((e.clientX - rect.left) / width) * 2 - 1
      mouseRef.current.targetY = ((e.clientY - rect.top) / height) * 2 - 1
    }
    window.addEventListener('mousemove', handleMouseMove)

    // Define 3D wireframe grid details
    const cols = 28
    const rows = 16
    const spacingX = 40
    const spacingZ = 35

    let time = 0

    // Animation Loop
    const render = () => {
      ctx.clearRect(0, 0, width, height)

      // Smooth mouse interpolation
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05

      time += (isPlaying ? 0.08 : 0.02) * speedMultiplier

      const fov = 350
      const tiltX = 0.5 + mouseRef.current.y * 0.2 // Camera elevation
      const tiltY = mouseRef.current.x * 0.4 // Camera pan

      // Generate grid points and project them
      const projectedGrid = []

      for (let r = 0; r < rows; r++) {
        projectedGrid[r] = []
        for (let c = 0; c < cols; c++) {
          // Center coordinate offsets
          const rawX = (c - cols / 2) * spacingX
          const rawZ = (r - rows / 2) * spacingZ + 150 // Shift forward in space

          // Dynamic wave height (Y) using overlayed sine waves
          let waveY = 0
          if (isPlaying) {
            // High energy waveforms resembling guitar riffs
            waveY += Math.sin(c * 0.4 - time * 2.5) * 45
            waveY += Math.cos(r * 0.5 + time * 1.5) * 25
            waveY += Math.sin((c + r) * 0.2 - time) * 15
            // Add distortion noise spikes
            if (Math.random() > 0.96) waveY += (Math.random() * 2 - 1) * 35
          } else {
            // Calm, low noise idle waves
            waveY += Math.sin(c * 0.3 - time * 0.8) * 12
            waveY += Math.cos(r * 0.3 + time * 0.5) * 8
          }

          // Apply 3D Rotations
          // Rotate Y (pan)
          const cosY = Math.cos(tiltY)
          const sinY = Math.sin(tiltY)
          let x1 = rawX * cosY - rawZ * sinY
          let z1 = rawX * sinY + rawZ * cosY

          // Rotate X (tilt down)
          const cosX = Math.cos(tiltX)
          const sinX = Math.sin(tiltX)
          let y2 = waveY * cosX - z1 * sinX
          let z2 = waveY * sinX + z1 * cosX

          // Perspective projection
          const scale = fov / (fov + z2)
          const projX = width / 2 + x1 * scale
          const projY = height / 2 + 100 + y2 * scale // vertical offset for dramatic angle

          projectedGrid[r][c] = { x: projX, y: projY, depth: z2 }
        }
      }

      // Draw grid lines in high-contrast monochrome
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const current = projectedGrid[r][c]
          if (!current) continue

          // Fade out based on depth
          const maxDepth = fov + 300
          const alpha = Math.max(0, 1 - current.depth / maxDepth)

          // Set stroke style (white line with depth fade)
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.25})`

          // Draw line to right neighbor
          if (c < cols - 1) {
            const right = projectedGrid[r][c + 1]
            if (right) {
              ctx.lineWidth = c % 2 === 0 ? 1 : 0.5
              ctx.beginPath()
              ctx.moveTo(current.x, current.y)
              ctx.lineTo(right.x, right.y)
              ctx.stroke()
            }
          }

          // Draw line to down neighbor (depth lines)
          if (r < rows - 1) {
            const down = projectedGrid[r + 1][c]
            if (down) {
              ctx.lineWidth = r % 2 === 0 ? 1 : 0.5
              ctx.beginPath()
              ctx.moveTo(current.x, current.y)
              ctx.lineTo(down.x, down.y)
              ctx.stroke()
            }
          }

          // Draw stark point dots on key grid intersections
          if (c % 3 === 0 && r % 2 === 0 && alpha > 0.1) {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`
            ctx.beginPath()
            ctx.arc(current.x, current.y, 2, 0, 2 * Math.PI)
            ctx.fill()
          }
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
      cancelAnimationFrame(animationFrameId)
    }
  }, [isPlaying, speedMultiplier])

  return (
    <canvas 
      ref={canvasRef} 
      style={{ 
        display: 'block', 
        width: '100%', 
        height: '100%', 
        position: 'absolute', 
        top: 0, 
        left: 0,
        zIndex: 0,
        pointerEvents: 'none'
      }} 
    />
  )
}
