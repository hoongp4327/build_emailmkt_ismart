import { useState, useRef, useCallback, useEffect } from 'react'

const MAX_HISTORY_STEPS = 60

/**
 * Custom Hook quản lý state EmailDoc và lịch sử Undo / Redo.
 * Tích hợp debounce gộp các thao tác gõ phím và phím tắt toàn cục Ctrl+Z / Ctrl+Shift+Z.
 *
 * @param {import('../model/types.js').EmailDoc} initialDoc
 * @returns {Object}
 */
export function useHistory(initialDoc) {
  const [doc, setDocState] = useState(initialDoc)
  const [past, setPast] = useState([])
  const [future, setFuture] = useState([])

  const docRef = useRef(doc)
  docRef.current = doc

  const pastRef = useRef(past)
  pastRef.current = past

  const futureRef = useRef(future)
  futureRef.current = future

  // Timer và snapshot đệm để debounce khi người dùng gõ phím liên tục
  const debounceTimerRef = useRef(null)
  const pendingSnapshotRef = useRef(null)
  const lastSnapshotRef = useRef(initialDoc)

  /**
   * Đẩy ngay snapshot đang chờ debounce vào lịch sử (flush) trước khi hoàn tác.
   */
  const flushDebounce = useCallback(() => {
    if (debounceTimerRef.current && pendingSnapshotRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
      const snapshot = pendingSnapshotRef.current
      pendingSnapshotRef.current = null
      const nextPast = [...pastRef.current.slice(-(MAX_HISTORY_STEPS - 1)), snapshot]
      setPast(nextPast)
      pastRef.current = nextPast
      setFuture([])
      futureRef.current = []
      lastSnapshotRef.current = docRef.current
    }
  }, [])

  /**
   * Cập nhật doc và lưu vào lịch sử (có debounce cho text hoặc lưu ngay lập tức).
   */
  const updateDoc = useCallback((newDocOrUpdater, options = {}) => {
    const { immediate = false, debounce = false } = options

    setDocState((currentDoc) => {
      const nextDoc = typeof newDocOrUpdater === 'function' ? newDocOrUpdater(currentDoc) : newDocOrUpdater
      if (nextDoc === currentDoc) return currentDoc

      if (immediate) {
        // Lưu ngay snapshot vào past (dành cho thêm, xóa, kéo thả, đổi style)
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current)
          debounceTimerRef.current = null
          pendingSnapshotRef.current = null
        }
        setPast((prev) => [...prev.slice(-(MAX_HISTORY_STEPS - 1)), currentDoc])
        setFuture([])
        lastSnapshotRef.current = nextDoc
      } else if (debounce) {
        // Debounce gộp các lần gõ chữ trong 400ms thành 1 bước undo
        if (!debounceTimerRef.current) {
          pendingSnapshotRef.current = currentDoc
          debounceTimerRef.current = setTimeout(() => {
            const snapshot = pendingSnapshotRef.current
            pendingSnapshotRef.current = null
            debounceTimerRef.current = null
            if (snapshot) {
              setPast((prev) => [...prev.slice(-(MAX_HISTORY_STEPS - 1)), snapshot])
              setFuture([])
              lastSnapshotRef.current = docRef.current
            }
          }, 400)
        }
      } else {
        // Mặc định: lưu ngay
        setPast((prev) => [...prev.slice(-(MAX_HISTORY_STEPS - 1)), currentDoc])
        setFuture([])
        lastSnapshotRef.current = nextDoc
      }

      return nextDoc
    })
  }, [])

  /**
   * Hoàn tác (Undo) - flush debounce trước khi lùi lịch sử (Ràng buộc 8)
   */
  const undo = useCallback(() => {
    flushDebounce()

    if (pastRef.current.length === 0) return

    const previous = pastRef.current[pastRef.current.length - 1]
    const newPast = pastRef.current.slice(0, pastRef.current.length - 1)

    setPast(newPast)
    pastRef.current = newPast
    setFuture((prev) => [docRef.current, ...prev.slice(0, MAX_HISTORY_STEPS - 1)])
    setDocState(previous)
    lastSnapshotRef.current = previous
  }, [flushDebounce])

  /**
   * Làm lại (Redo)
   */
  const redo = useCallback(() => {
    flushDebounce()

    if (futureRef.current.length === 0) return

    const next = futureRef.current[0]
    const newFuture = futureRef.current.slice(1)

    setPast((prev) => [...prev.slice(-(MAX_HISTORY_STEPS - 1)), docRef.current])
    setFuture(newFuture)
    setDocState(next)
    lastSnapshotRef.current = next
  }, [])

  /**
   * Bắt phím tắt toàn cục:
   * Ctrl+Z: Undo
   * Ctrl+Shift+Z hoặc Ctrl+Y: Redo
   * QUY TẮC BẮT BUỘC: Luôn preventDefault() và ưu tiên undo của app ngay cả khi đang focus trong input/textarea.
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform)
      const isMod = isMac ? e.metaKey : e.ctrlKey

      if (!isMod) return

      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault()
        if (e.shiftKey) {
          redo()
        } else {
          undo()
        }
      } else if (!isMac && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [undo, redo])

  return {
    doc,
    setDoc: updateDoc,
    undo,
    redo,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    pastCount: past.length,
    futureCount: future.length,
    resetHistory: useCallback((newDoc) => {
      setDocState(newDoc)
      setPast([])
      setFuture([])
      lastSnapshotRef.current = newDoc
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
        debounceTimerRef.current = null
      }
    }, []),
  }
}
