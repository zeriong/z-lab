// model-bump 사후 관측 헬퍼 — navigate_page 의 initScript 로 모든 셀에 동일하게 주입한다.
// 표본 소스는 건드리지 않는다. 계측 규율(transfer SPEC): setPointerCapture 전 셀 무력화,
// 리스너 종류·좌표는 셀 소스에서 읽어 인자로 준다, 0이 나오면 계측부터 의심한다.
(() => {
  window.__errs = []
  addEventListener('error', (e) => __errs.push(String(e.message || e)))
  addEventListener('unhandledrejection', (e) => __errs.push('unhandled: ' + String(e.reason && (e.reason.stack || e.reason))))
  Element.prototype.setPointerCapture = function () {}
  Element.prototype.releasePointerCapture = function () {}

  const big = () => [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0]
  const snap = () => {
    const c = big(); if (!c || !c.width) return null
    const o = document.createElement('canvas'); o.width = Math.ceil(c.width / 4); o.height = Math.ceil(c.height / 4)
    const g = o.getContext('2d'); g.drawImage(c, 0, 0, o.width, o.height)
    return g.getImageData(0, 0, o.width, o.height).data
  }
  const diff = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 24) n++; return n }
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()))

  // 프레임 간 변화 픽셀 수 배열 (1/4 다운샘플). 무입력 대조 구간과 발사 후 구간에 같은 함수를 쓴다.
  window.__motion = async (frames = 30, every = 2) => {
    const out = []; let prev = snap(); if (!prev) return { canvas: false }
    for (let i = 0; i < frames; i++) { for (let k = 0; k < every; k++) await frame(); const cur = snap(); out.push(diff(prev, cur)); prev = cur }
    return { canvas: true, blank: prev.every((v, i) => i % 4 === 3 || v === 0), diffs: out }
  }

  // 합성 드래그: kind = 'pointer' | 'mouse' | 'touch'. 좌표는 client 좌표.
  window.__drag = async (x1, y1, x2, y2, kind = 'pointer', steps = 12) => {
    const t = document.elementFromPoint(x1, y1) || big()
    const fire = (type, x, y) => {
      if (kind === 'touch') {
        const touch = new Touch({ identifier: 1, target: t, clientX: x, clientY: y, pageX: x, pageY: y })
        const list = type === 'touchend' ? [] : [touch]
        t.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: list, targetTouches: list, changedTouches: [touch] }))
      } else {
        const C = kind === 'pointer' ? PointerEvent : MouseEvent
        t.dispatchEvent(new C(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, pageX: x, pageY: y, button: 0, buttons: type.endsWith('up') ? 0 : 1, pointerId: 1, pointerType: 'mouse', isPrimary: true, view: window }))
      }
    }
    const [down, move, up] = kind === 'pointer' ? ['pointerdown', 'pointermove', 'pointerup'] : kind === 'mouse' ? ['mousedown', 'mousemove', 'mouseup'] : ['touchstart', 'touchmove', 'touchend']
    fire(down, x1, y1); await frame()
    for (let i = 1; i <= steps; i++) { fire(move, x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps); await frame() }
    fire(up, x2, y2)
    return { target: t && (t.tagName + (t.id ? '#' + t.id : '')) }
  }
})()
