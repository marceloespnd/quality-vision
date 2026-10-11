// Display the supplied artwork through a viewport, preserving its original pixels.
export default function BrandLogo({ theme }) {
  const dark = theme === 'dark'
  const crop = { x: dark ? 824 : 106, y: 165, width: 508, height: 264 }
  return <span className="relative block w-full max-w-[140px] overflow-hidden rounded-[50%]" style={{ aspectRatio: `${crop.width} / ${crop.height}` }}>
    <img src="/quality-vision-themes.png" alt="Quality Vision" draggable="false"
      style={{ position: 'absolute', maxWidth: 'none', width: `${1440 / crop.width * 100}%`, left: `${-crop.x / crop.width * 100}%`, top: `${-crop.y / crop.height * 100}%` }} />
  </span>
}
