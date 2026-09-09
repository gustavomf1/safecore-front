import { useEffect, useRef, useState } from 'react'

type Ripple = { x: number; y: number; t: number }

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`

const SHARED = `
precision highp float;
uniform vec2 uResolution;
uniform vec2 uMouse;
uniform float uTime;
uniform vec3 uRipples[6];
out vec4 outColor;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1,0)), u.x),
             mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), u.x), u.y);
}
float fbm(vec2 p){
  float v = 0.0; float a = 0.5;
  for (int k = 0; k < 5; k++){ v += a*noise(p); p *= 2.0; a *= 0.5; }
  return v;
}
`

// ─── Shader 1: Plasma Flow ──────────────────────────────────────────────────
const FRAG_PLASMA = `#version 300 es
${SHARED}
void main(){
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = uv; p.x *= aspect;
  vec2 m = uMouse; m.x *= aspect;

  vec2 flow = p + vec2(cos(uTime*0.22), sin(uTime*0.18)) * 0.35;
  flow += (m - p) * 0.18 * (0.55 + 0.45*sin(uTime*0.5));

  float n1 = fbm(flow * 1.6 + uTime*0.07);
  float n2 = fbm(flow * 2.9 - uTime*0.05 + n1);

  float rip = 0.0;
  for (int i = 0; i < 6; i++){
    vec3 r = uRipples[i];
    if (r.z > 0.0 && r.z < 2.5){
      vec2 rp = r.xy; rp.x *= aspect;
      float d = distance(p, rp);
      rip += sin(d*26.0 - r.z*9.0) * exp(-d*4.0) * exp(-r.z*1.4);
    }
  }

  float v = n2 + rip*0.32;

  vec3 navy   = vec3(0.015, 0.035, 0.10);
  vec3 deep   = vec3(0.010, 0.110, 0.235);
  vec3 accent = vec3(0.015, 0.415, 0.630);
  vec3 cyan   = vec3(0.220, 0.740, 0.970);

  vec3 col = mix(navy, deep, v);
  col = mix(col, accent, smoothstep(0.46, 0.72, v));
  col = mix(col, cyan, smoothstep(0.74, 0.95, v) * 0.8);

  float md = distance(p, m);
  col += cyan * exp(-md*3.3) * 0.20;

  float vig = smoothstep(1.25, 0.25, length(uv - 0.5));
  col *= 0.45 + 0.55*vig;

  outColor = vec4(col, 1.0);
}`

// ─── Shader 2: Neural Grid ──────────────────────────────────────────────────
const FRAG_GRID = `#version 300 es
${SHARED}
void main(){
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = (uv * 2.0 - 1.0); p.x *= aspect;
  vec2 m = (uMouse * 2.0 - 1.0); m.x *= aspect;

  vec2 dir = p - m;
  float d = length(dir);
  vec2 warp = p - normalize(dir + 1e-4) * 0.18 * exp(-d*1.25);

  vec2 gCell = fract(warp * 6.0 + uTime*0.03) - 0.5;
  float lines = min(abs(gCell.x), abs(gCell.y));
  float nodes = max(0.0, 1.0 - length(gCell) * 3.0);

  float rings = 0.0;
  for (int i = 0; i < 6; i++){
    vec3 r = uRipples[i];
    if (r.z > 0.0 && r.z < 2.5){
      vec2 rp = (r.xy * 2.0 - 1.0); rp.x *= aspect;
      float rd = distance(p, rp);
      rings += smoothstep(0.025, 0.0, abs(rd - r.z*0.65)) * exp(-r.z*1.1);
    }
  }

  vec3 bg = mix(vec3(0.015, 0.040, 0.100), vec3(0.010, 0.075, 0.175), smoothstep(0.0, 2.0, d));
  vec3 lineCol = vec3(0.018, 0.415, 0.630);
  vec3 nodeCol = vec3(0.220, 0.740, 0.970);
  vec3 hotCol  = vec3(0.730, 0.900, 0.995);

  vec3 col = bg;
  col += lineCol * smoothstep(0.035, 0.0, lines) * 0.55;
  col += nodeCol * pow(nodes, 4.0) * 0.9;
  col += hotCol * rings;
  col += nodeCol * exp(-d*2.2) * 0.28;

  outColor = vec4(col, 1.0);
}`

// ─── Shader 3: Aurora Waves ─────────────────────────────────────────────────
const FRAG_AURORA = `#version 300 es
${SHARED}
void main(){
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  vec2 p = uv;
  vec2 m = uMouse;

  float mx = (m.x - p.x) * 0.6;
  float dy = (p.y - m.y);

  float w1 = sin(p.x*6.0 + uTime*0.55 + mx*4.0) * 0.11 + 0.32;
  float w2 = sin(p.x*4.0 - uTime*0.38 + mx*2.6) * 0.15 + 0.55;
  float w3 = sin(p.x*9.0 + uTime*0.75 + mx*1.5) * 0.07 + 0.75;

  // subtle fbm perturbation
  float n = fbm(p*3.0 + uTime*0.12) * 0.06;

  vec3 navy  = vec3(0.010, 0.025, 0.075);
  vec3 aqua  = vec3(0.015, 0.415, 0.630);
  vec3 cyan  = vec3(0.220, 0.740, 0.970);
  vec3 light = vec3(0.730, 0.900, 0.995);

  vec3 col = navy;
  col = mix(col, aqua, smoothstep(w1+0.04+n, w1-0.05+n, p.y));
  col = mix(col, cyan, smoothstep(w2+0.05+n, w2-0.07+n, p.y) * 0.7);
  col = mix(col, light*0.6, smoothstep(w3+0.025, w3-0.035, p.y) * 0.55);

  for (int i = 0; i < 6; i++){
    vec3 r = uRipples[i];
    if (r.z > 0.0 && r.z < 2.5){
      float d = distance(uv, r.xy);
      col += cyan * sin(d*32.0 - r.z*10.0) * exp(-d*3.4) * exp(-r.z*1.5) * 0.4;
    }
  }

  float mouseGlow = exp(-distance(uv, m)*3.2);
  col += cyan * mouseGlow * 0.22;

  col *= smoothstep(1.15, 0.05, p.y * 0.85);
  col += vec3(0.02, 0.05, 0.12) * (1.0 - uv.y) * 0.4;

  outColor = vec4(col, 1.0);
}`

// ─── Shader 4: Constellation ────────────────────────────────────────────────
const FRAG_STARS = `#version 300 es
${SHARED}
void main(){
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = uv; p.x *= aspect;
  vec2 m = uMouse; m.x *= aspect;

  vec3 col = mix(vec3(0.008, 0.018, 0.055), vec3(0.018, 0.060, 0.145), uv.y);

  // subtle fbm glow in background
  float bgN = fbm(uv*2.2 + uTime*0.05);
  col += vec3(0.015, 0.050, 0.12) * bgN * 0.8;

  float stars = 0.0;
  float lines = 0.0;
  for (int i = 0; i < 42; i++){
    float fi = float(i);
    vec2 seed = vec2(fract(sin(fi*12.9898)*43758.5453),
                     fract(sin(fi*78.233 )*43758.5453));
    seed.x *= aspect;
    vec2 drift = vec2(sin(uTime*0.10 + fi*0.7), cos(uTime*0.13 + fi*1.3)) * 0.035;
    vec2 pos = seed + drift;

    vec2 toM = m - pos;
    float dm = length(toM);
    pos += toM * 0.18 * exp(-dm*1.8);

    float d = distance(p, pos);
    float sz = 0.0035 + 0.0025*sin(uTime*2.0 + fi*7.1);
    stars += smoothstep(sz*2.4, sz*0.3, d);

    // line to mouse when close
    float lineMask = exp(-dm*2.0);
    vec2 ab = p - pos;
    vec2 mb = m - pos;
    float t = clamp(dot(ab, mb) / (dot(mb, mb) + 1e-4), 0.0, 1.0);
    float ld = distance(p, pos + mb * t);
    lines += smoothstep(0.0025, 0.0, ld) * lineMask * 0.5;
  }

  vec3 starCol = vec3(0.730, 0.900, 0.995);
  vec3 lineCol = vec3(0.220, 0.740, 0.970);
  col += starCol * stars * 0.95;
  col += lineCol * lines * 0.55;

  col += lineCol * exp(-distance(p, m)*2.6) * 0.28;

  for (int i = 0; i < 6; i++){
    vec3 r = uRipples[i];
    if (r.z > 0.0 && r.z < 2.5){
      vec2 rp = r.xy; rp.x *= aspect;
      float d = distance(p, rp);
      col += lineCol * smoothstep(0.012, 0.0, abs(d - r.z*0.55)) * exp(-r.z*1.4);
    }
  }

  outColor = vec4(col, 1.0);
}`

const VARIANTS = [
  { name: 'Plasma',       frag: FRAG_PLASMA },
  { name: 'Neural Grid',  frag: FRAG_GRID },
  { name: 'Aurora',       frag: FRAG_AURORA },
  { name: 'Constellation',frag: FRAG_STARS },
]

interface ShaderWallpaperProps {
  className?: string
  initialVariant?: number
  showSwitcher?: boolean
}

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('Shader error:', gl.getShaderInfoLog(sh), src)
    gl.deleteShader(sh)
    return null
  }
  return sh
}

function linkProgram(gl: WebGL2RenderingContext, fragSrc: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT)
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragSrc)
  if (!vs || !fs) return null
  const prog = gl.createProgram()!
  gl.attachShader(prog, vs)
  gl.attachShader(prog, fs)
  gl.linkProgram(prog)
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Link error:', gl.getProgramInfoLog(prog))
    return null
  }
  return prog
}

export function ShaderWallpaper({ className, initialVariant = 0, showSwitcher = true }: ShaderWallpaperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef<[number, number]>([0.5, 0.5])
  const ripplesRef = useRef<Ripple[]>([])
  const [variant, setVariant] = useState(initialVariant)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: false })
    if (!gl) {
      canvas.style.background = 'linear-gradient(135deg, #0f172a, #0369a1)'
      return
    }

    const prog = linkProgram(gl, VARIANTS[variant].frag)
    if (!prog) return
    gl.useProgram(prog)

    // Fullscreen triangle
    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, 'uResolution')
    const uMouse = gl.getUniformLocation(prog, 'uMouse')
    const uTime = gl.getUniformLocation(prog, 'uTime')
    const uRipples = gl.getUniformLocation(prog, 'uRipples[0]')

    const start = performance.now()
    let rafId = 0
    const currMouse: [number, number] = [0.5, 0.5]

    function resize() {
      const rect = canvas!.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio, 2)
      const w = Math.max(1, Math.round(rect.width * dpr))
      const h = Math.max(1, Math.round(rect.height * dpr))
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w
        canvas!.height = h
      }
      gl!.viewport(0, 0, w, h)
    }

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    function frame() {
      const now = performance.now()
      const t = (now - start) / 1000

      // Ease toward target mouse for silky motion
      const tgt = mouseRef.current
      currMouse[0] += (tgt[0] - currMouse[0]) * 0.08
      currMouse[1] += (tgt[1] - currMouse[1]) * 0.08

      // Pack ripples: [x, y, age] for up to 6
      const rp = ripplesRef.current
      const ripArr = new Float32Array(18)
      for (let i = 0; i < 6; i++) {
        const r = rp[i]
        if (r) {
          const age = (now - r.t) / 1000
          if (age < 2.5) {
            ripArr[i * 3] = r.x
            ripArr[i * 3 + 1] = r.y
            ripArr[i * 3 + 2] = age
          }
        }
      }

      gl!.uniform2f(uRes, canvas!.width, canvas!.height)
      gl!.uniform2f(uMouse, currMouse[0], currMouse[1])
      gl!.uniform1f(uTime, t)
      gl!.uniform3fv(uRipples, ripArr)

      gl!.drawArrays(gl!.TRIANGLES, 0, 3)
      rafId = requestAnimationFrame(frame)
    }

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = 1 - (e.clientY - rect.top) / rect.height
      mouseRef.current = [Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y))]
    }

    function onClick(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect()
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) return
      const x = (e.clientX - rect.left) / rect.width
      const y = 1 - (e.clientY - rect.top) / rect.height
      const rp = ripplesRef.current
      rp.unshift({ x, y, t: performance.now() })
      if (rp.length > 6) rp.length = 6
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches[0]) {
        const fake = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as MouseEvent
        onMove(fake)
      }
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches[0]) {
        const fake = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY } as MouseEvent
        onClick(fake)
        onMove(fake)
      }
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('click', onClick)
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchstart', onTouchStart, { passive: true })

    frame()

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onClick)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchstart', onTouchStart)
      gl.deleteProgram(prog)
      gl.deleteBuffer(buf)
    }
  }, [variant])

  return (
    <div className={className} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      {showSwitcher && (
        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: 8,
            padding: '8px 14px',
            background: 'rgba(8, 14, 28, 0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(56, 189, 248, 0.18)',
            borderRadius: 999,
            zIndex: 10,
          }}
        >
          {VARIANTS.map((v, i) => (
            <button
              key={v.name}
              onClick={() => setVariant(i)}
              title={v.name}
              aria-label={v.name}
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                border: 'none',
                cursor: 'pointer',
                background: i === variant ? 'rgba(56, 189, 248, 0.95)' : 'rgba(148, 163, 184, 0.35)',
                boxShadow: i === variant ? '0 0 10px rgba(56, 189, 248, 0.7)' : 'none',
                padding: 0,
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
