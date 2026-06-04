'use client'

import { useCallback, useRef, useState } from 'react'
import { IconImage, IconWand, IconDownload, IconUpload, IconTrash } from './icons'

type Source = { id: string; name: string; url: string; img: HTMLImageElement; w: number; h: number }
type Result = { id: string; name: string; url: string; size: number; w: number; h: number }

type Opts = {
  brightness: number; contrast: number; saturation: number; hue: number
  rotate: number; crop: number; flip: boolean; variants: number; quality: number
}

const DEFAULTS: Opts = {
  brightness: 5, contrast: 5, saturation: 6, hue: 4,
  rotate: 1.5, crop: 4, flip: false, variants: 1, quality: 92,
}

const pm = (x: number) => (Math.random() * 2 - 1) * x
const rid = () => Math.random().toString(36).slice(2, 9)
const kb = (b: number) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)

// 한 장을 랜덤 미세 변형해 JPEG Blob 생성 (Canvas 재인코딩 → EXIF/메타데이터 자동 제거)
function washOnce(img: HTMLImageElement, o: Opts): Promise<Blob | null> {
  const w = img.naturalWidth, h = img.naturalHeight
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext('2d')!

  const b = 1 + pm(o.brightness) / 100
  const c = 1 + pm(o.contrast) / 100
  const s = 1 + pm(o.saturation) / 100
  const hue = pm(o.hue)
  const ang = (pm(o.rotate) * Math.PI) / 180
  const zoom = 1 + (Math.random() * o.crop) / 100
  const flip = o.flip && Math.random() < 0.5

  // 회전 시 모서리에 빈 공간이 생기지 않도록 충분히 확대
  const sx = Math.abs(Math.cos(ang)) + Math.abs(Math.sin(ang)) * (h / w)
  const sy = Math.abs(Math.cos(ang)) + Math.abs(Math.sin(ang)) * (w / h)
  const scale = Math.max(zoom, sx, sy)

  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, w, h)
  ctx.filter = `brightness(${b}) contrast(${c}) saturate(${s}) hue-rotate(${hue}deg)`
  ctx.translate(w / 2, h / 2)
  ctx.rotate(ang)
  ctx.scale(flip ? -scale : scale, scale)
  ctx.drawImage(img, -w / 2, -h / 2, w, h)

  const q = Math.min(0.97, Math.max(0.6, (o.quality + pm(1.5)) / 100))
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', q))
}

export default function WashTool() {
  const [sources, setSources] = useState<Source[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [opts, setOpts] = useState<Opts>(DEFAULTS)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).filter(f => f.type.startsWith('image/')).forEach(f => {
      const url = URL.createObjectURL(f)
      const img = new Image()
      img.onload = () => setSources(prev => [...prev, {
        id: rid(), name: f.name.replace(/\.[^.]+$/, ''), url, img, w: img.naturalWidth, h: img.naturalHeight,
      }])
      img.src = url
    })
  }, [])

  const removeSource = (id: string) => setSources(prev => prev.filter(s => s.id !== id))
  const clearAll = () => {
    sources.forEach(s => URL.revokeObjectURL(s.url))
    results.forEach(r => URL.revokeObjectURL(r.url))
    setSources([]); setResults([])
  }

  async function run() {
    if (!sources.length) return
    setBusy(true)
    results.forEach(r => URL.revokeObjectURL(r.url))
    const out: Result[] = []
    for (const s of sources) {
      for (let v = 0; v < opts.variants; v++) {
        const blob = await washOnce(s.img, opts)
        if (!blob) continue
        const suffix = opts.variants > 1 ? `_${v + 1}` : ''
        out.push({ id: rid(), name: `${s.name}_wash${suffix}.jpg`, url: URL.createObjectURL(blob), size: blob.size, w: s.w, h: s.h })
      }
    }
    setResults(out)
    setBusy(false)
  }

  function download(r: Result) {
    const a = document.createElement('a')
    a.href = r.url; a.download = r.name; a.click()
  }
  async function downloadAll() {
    for (const r of results) { download(r); await new Promise(res => setTimeout(res, 250)) }
  }

  return (
    <div className="px-5 py-5 lg:px-8 lg:py-6 max-w-[1200px] mx-auto">
      {/* 헤더 */}
      <header className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white">
          <IconImage width={22} height={22} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">이미지 워싱</h1>
          <p className="text-sm text-gray-400">메타데이터(EXIF)를 제거하고 명암·각도·크롭을 랜덤하게 미세 조정해 새 파일로 만듭니다.</p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* 설정 패널 */}
        <section className="rounded-2xl border border-gray-100 bg-white p-5 lg:col-span-1">
          <h2 className="mb-4 text-base font-bold text-gray-900">변형 강도</h2>
          <div className="space-y-4">
            <Slider label="명암(밝기)" unit="±%" min={0} max={20} value={opts.brightness} onChange={v => setOpts(o => ({ ...o, brightness: v }))} />
            <Slider label="대비" unit="±%" min={0} max={20} value={opts.contrast} onChange={v => setOpts(o => ({ ...o, contrast: v }))} />
            <Slider label="채도" unit="±%" min={0} max={25} value={opts.saturation} onChange={v => setOpts(o => ({ ...o, saturation: v }))} />
            <Slider label="색조" unit="±°" min={0} max={15} value={opts.hue} onChange={v => setOpts(o => ({ ...o, hue: v }))} />
            <Slider label="회전" unit="±°" min={0} max={6} step={0.5} value={opts.rotate} onChange={v => setOpts(o => ({ ...o, rotate: v }))} />
            <Slider label="크롭(줌)" unit="max%" min={0} max={12} value={opts.crop} onChange={v => setOpts(o => ({ ...o, crop: v }))} />
            <Slider label="JPEG 품질" unit="%" min={60} max={97} value={opts.quality} onChange={v => setOpts(o => ({ ...o, quality: v }))} />
            <Slider label="장당 생성 수" unit="개" min={1} max={10} value={opts.variants} onChange={v => setOpts(o => ({ ...o, variants: v }))} />
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={opts.flip} onChange={e => setOpts(o => ({ ...o, flip: e.target.checked }))} className="h-4 w-4 rounded" />
              좌우 반전 랜덤 적용
            </label>
          </div>
          <button onClick={() => setOpts(DEFAULTS)} className="mt-4 w-full rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50">기본값으로</button>
          <p className="mt-3 text-[11px] leading-relaxed text-gray-400">
            ✓ Canvas 재인코딩으로 원본의 EXIF·위치정보가 제거됩니다.<br />
            ✓ 모든 처리는 브라우저 안에서만 일어나며 서버로 전송되지 않습니다.
          </p>
        </section>

        {/* 업로드 + 결과 */}
        <section className="lg:col-span-2 space-y-5">
          {/* 드롭존 */}
          <div
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
            onClick={() => inputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition
              ${drag ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'}`}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600"><IconUpload width={22} height={22} /></span>
            <p className="text-sm font-semibold text-gray-700">이미지를 드래그하거나 클릭해서 올리기</p>
            <p className="text-xs text-gray-400">JPG · PNG · WEBP · 여러 장 가능</p>
            <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={e => addFiles(e.target.files)} />
          </div>

          {/* 액션 바 */}
          {sources.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4">
              <span className="text-sm text-gray-500">원본 {sources.length}장 · 생성 예정 {sources.length * opts.variants}장</span>
              <div className="flex gap-2">
                <button onClick={clearAll} className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50">전체 비우기</button>
                <button onClick={run} disabled={busy} className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300">
                  <IconWand width={16} height={16} /> {busy ? '처리 중…' : '워싱 실행'}
                </button>
              </div>
            </div>
          )}

          {/* 원본 썸네일 */}
          {sources.length > 0 && (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {sources.map(s => (
                <div key={s.id} className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.url} alt={s.name} className="aspect-square w-full object-cover" />
                  <button onClick={() => removeSource(s.id)} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
                    <IconTrash width={15} height={15} />
                  </button>
                  <p className="truncate px-2 py-1 text-[11px] text-gray-500">{s.w}×{s.h}</p>
                </div>
              ))}
            </div>
          )}

          {/* 결과 */}
          {results.length > 0 && (
            <div className="rounded-2xl border border-gray-100 bg-white p-5">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-bold text-gray-900">워싱 결과 {results.length}장</h2>
                <button onClick={downloadAll} className="flex items-center gap-1.5 rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800">
                  <IconDownload width={16} height={16} /> 전체 다운로드
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {results.map(r => (
                  <div key={r.id} className="overflow-hidden rounded-xl border border-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.url} alt={r.name} className="aspect-square w-full object-cover" />
                    <div className="p-2">
                      <p className="truncate text-[11px] text-gray-500" title={r.name}>{r.name}</p>
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[11px] text-gray-400">{r.w}×{r.h} · {kb(r.size)}</span>
                        <button onClick={() => download(r)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100">
                          <IconDownload width={14} height={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Slider({ label, unit, min, max, step = 1, value, onChange }: {
  label: string; unit: string; min: number; max: number; step?: number; value: number; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-semibold text-blue-600">{value}<span className="ml-0.5 text-xs text-gray-400">{unit}</span></span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-600" />
    </div>
  )
}
