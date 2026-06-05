'use client'

import { useCallback, useRef, useState } from 'react'
import { IconImage, IconWand, IconDownload, IconUpload, IconTrash } from './icons'

type Source = { id: string; name: string; url: string; img: HTMLImageElement; w: number; h: number; size: number }
type Result = { id: string; name: string; url: string; size: number; w: number; h: number }
type QualityWarning = { name: string; size: number; w: number; h: number }

type Opts = {
  brightness: number; contrast: number; saturation: number; hue: number
  rotate: number; crop: number; flip: boolean; variants: number; quality: number
  sharpen: number; preview: boolean
}

const DEFAULTS: Opts = {
  brightness: 5, contrast: 5, saturation: 6, hue: 4,
  rotate: 1.5, crop: 4, flip: false, variants: 1, quality: 92,
  sharpen: 0, preview: false,
}

const LOW_SIZE = 1.2 * 1024 * 1024  // 1.2 MB
const LOW_RES = 800                  // 짧은 쪽 800px 미만

const pm = (x: number) => (Math.random() * 2 - 1) * x
const rid = () => Math.random().toString(36).slice(2, 9)
const kb = (b: number) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`)

// Unsharp mask: 블러 버전과의 차이를 원본에 더해 선명도 증가
function applySharpening(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, amount: number) {
  if (amount <= 0) return
  const w = canvas.width, h = canvas.height
  const blurCanvas = document.createElement('canvas')
  blurCanvas.width = w; blurCanvas.height = h
  const blurCtx = blurCanvas.getContext('2d')!
  blurCtx.filter = `blur(${amount * 0.5}px)`
  blurCtx.drawImage(canvas, 0, 0)
  const imgData = ctx.getImageData(0, 0, w, h)
  const orig = new Uint8ClampedArray(imgData.data)
  const blurred = blurCtx.getImageData(0, 0, w, h).data
  const out = imgData.data
  const factor = amount * 0.6
  for (let i = 0; i < out.length; i += 4) {
    out[i]   = Math.max(0, Math.min(255, orig[i]   + factor * (orig[i]   - blurred[i])))
    out[i+1] = Math.max(0, Math.min(255, orig[i+1] + factor * (orig[i+1] - blurred[i+1])))
    out[i+2] = Math.max(0, Math.min(255, orig[i+2] + factor * (orig[i+2] - blurred[i+2])))
  }
  ctx.putImageData(imgData, 0, 0)
}

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

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.filter = 'none'
  if (o.sharpen > 0) applySharpening(canvas, ctx, o.sharpen)

  const q = Math.min(0.97, Math.max(0.6, (o.quality + pm(1.5)) / 100))
  return new Promise(res => canvas.toBlob(res, 'image/jpeg', q))
}

function previewFilterStr(opts: Opts): string | undefined {
  if (!opts.preview || opts.sharpen === 0) return undefined
  return `saturate(${(1 + opts.sharpen * 0.03).toFixed(3)})`
}

export default function WashTool() {
  const [sources, setSources] = useState<Source[]>([])
  const [results, setResults] = useState<Result[]>([])
  const [opts, setOpts] = useState<Opts>(DEFAULTS)
  const [busy, setBusy] = useState(false)
  const [drag, setDrag] = useState(false)
  const [qualityWarnings, setQualityWarnings] = useState<QualityWarning[]>([])
  const [showWarningModal, setShowWarningModal] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((files: FileList | null) => {
    if (!files) return
    Array.from(files).filter(f => f.type.startsWith('image/')).forEach(f => {
      const url = URL.createObjectURL(f)
      const img = new Image()
      img.onload = () => {
        const shortSide = Math.min(img.naturalWidth, img.naturalHeight)
        if (f.size < LOW_SIZE || shortSide < LOW_RES) {
          setQualityWarnings(prev => [...prev, { name: f.name, size: f.size, w: img.naturalWidth, h: img.naturalHeight }])
          setShowWarningModal(true)
        }
        setSources(prev => [...prev, {
          id: rid(), name: f.name.replace(/\.[^.]+$/, ''), url, img,
          w: img.naturalWidth, h: img.naturalHeight, size: f.size,
        }])
      }
      img.src = url
    })
  }, [])

  const removeSource = (id: string) => setSources(prev => prev.filter(s => s.id !== id))
  const clearAll = () => {
    sources.forEach(s => URL.revokeObjectURL(s.url))
    results.forEach(r => URL.revokeObjectURL(r.url))
    setSources([]); setResults([]); setQualityWarnings([])
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

  const pf = previewFilterStr(opts)

  return (
    <div className="px-5 py-5 lg:px-8 lg:py-6 max-w-[1200px] mx-auto">

      {/* 품질 경고 모달 */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-500 text-lg">⚠</span>
              <h3 className="text-base font-bold text-gray-900">이미지 품질 경고</h3>
            </div>
            <p className="mb-4 text-sm text-gray-600 leading-relaxed">
              아래 이미지는 <strong>용량이 1.2MB 미만</strong>이거나 <strong>해상도가 낮습니다</strong>.<br />
              블로그에 업로드하면 화질이 더 저하될 수 있습니다.
            </p>
            <ul className="mb-5 max-h-52 space-y-2 overflow-y-auto">
              {qualityWarnings.map((w, i) => (
                <li key={i} className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5">
                  <p className="truncate text-sm font-semibold text-amber-800">{w.name}</p>
                  <p className="mt-0.5 flex flex-wrap gap-2 text-xs text-amber-600">
                    {w.size < LOW_SIZE && <span>용량 {kb(w.size)} — 1.2MB 미만</span>}
                    {Math.min(w.w, w.h) < LOW_RES && <span>해상도 {w.w}×{w.h} — 짧은 쪽 800px 미만</span>}
                  </p>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
            >
              확인하고 계속 진행
            </button>
          </div>
        </div>
      )}

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
            <Slider label="명암(밝기)" unit="±%" min={0} max={40} value={opts.brightness} onChange={v => setOpts(o => ({ ...o, brightness: v }))} />
            <Slider label="대비" unit="±%" min={0} max={40} value={opts.contrast} onChange={v => setOpts(o => ({ ...o, contrast: v }))} />
            <Slider label="채도" unit="±%" min={0} max={40} value={opts.saturation} onChange={v => setOpts(o => ({ ...o, saturation: v }))} />
            <Slider label="색조" unit="±°" min={0} max={40} value={opts.hue} onChange={v => setOpts(o => ({ ...o, hue: v }))} />
            <Slider label="회전" unit="±°" min={0} max={6} step={0.5} value={opts.rotate} onChange={v => setOpts(o => ({ ...o, rotate: v }))} />
            <Slider label="크롭(줌)" unit="max%" min={0} max={12} value={opts.crop} onChange={v => setOpts(o => ({ ...o, crop: v }))} />
            <Slider label="JPEG 품질" unit="%" min={60} max={97} value={opts.quality} onChange={v => setOpts(o => ({ ...o, quality: v }))} />
            <Slider label="장당 생성 수" unit="개" min={1} max={10} value={opts.variants} onChange={v => setOpts(o => ({ ...o, variants: v }))} />

            {/* 화질 향상 섹션 */}
            <div className="border-t border-gray-100 pt-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400">화질 향상</p>
              <Slider
                label="선명도"
                unit=""
                min={0} max={5} step={0.5}
                value={opts.sharpen}
                onChange={v => setOpts(o => ({ ...o, sharpen: v }))}
                hint="Unsharp mask — 경계선을 또렷하게"
              />
            </div>

            <div className="border-t border-gray-100 pt-4 space-y-2.5">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={opts.flip} onChange={e => setOpts(o => ({ ...o, flip: e.target.checked }))} className="h-4 w-4 rounded accent-blue-600" />
                좌우 반전 랜덤 적용
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={opts.preview} onChange={e => setOpts(o => ({ ...o, preview: e.target.checked }))} className="h-4 w-4 rounded accent-blue-600" />
                원본 미리보기
                <span className="text-xs text-gray-400">(명암 확장 효과)</span>
              </label>
            </div>
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
            <div>
              {opts.preview && pf && (
                <p className="mb-2 text-xs text-gray-400">미리보기 활성 — 명암 확장 효과 반영 중 (선명도 효과는 워싱 실행 후 확인)</p>
              )}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {sources.map(s => (
                  <div key={s.id} className="group relative overflow-hidden rounded-xl border border-gray-100 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={s.url}
                      alt={s.name}
                      className="aspect-square w-full object-cover transition-all duration-200"
                      style={pf ? { filter: pf } : undefined}
                    />
                    {s.size < LOW_SIZE && (
                      <span className="absolute left-1.5 top-1.5 rounded-md bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">저용량</span>
                    )}
                    <button onClick={() => removeSource(s.id)} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
                      <IconTrash width={15} height={15} />
                    </button>
                    <p className="truncate px-2 py-1 text-[11px] text-gray-500">{s.w}×{s.h}</p>
                  </div>
                ))}
              </div>
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

function Slider({ label, unit, min, max, step = 1, value, onChange, hint }: {
  label: string; unit: string; min: number; max: number; step?: number
  value: number; onChange: (v: number) => void; hint?: string
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
      {hint && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
    </div>
  )
}
