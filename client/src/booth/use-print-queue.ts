import { useCallback, useEffect, useRef } from 'react'
import { claimPrintJob, finishPrintJob } from '../lib/api.ts'
import type { PrintPaper } from '../lib/booth-types.ts'
import { printStrip } from '../lib/print-strip.ts'

const POLL_MS = 4000

// The booth screen is the only device wired to the printer, so it prints every queued job:
// the guest's own prints and reprints sent from the admin dashboard. Returns a function
// that checks the queue right away (after a guest taps Print).
export function usePrintQueue(paper: PrintPaper | null): () => void {
  const busy = useRef(false)
  const paperRef = useRef(paper)
  useEffect(() => {
    paperRef.current = paper
  }, [paper])

  const printNext = useCallback(async () => {
    const currentPaper = paperRef.current
    if (busy.current || !currentPaper) return
    busy.current = true
    try {
      // Print until the queue is empty.
      for (;;) {
        const { job } = await claimPrintJob()
        if (!job) return
        let printed = true
        try {
          await printStrip(job.imageUrl, job.copies, currentPaper)
        } catch {
          printed = false
        }
        await finishPrintJob(job.id, printed)
      }
    } catch {
      // The server is unreachable; the next poll tries again.
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    if (!paper) return
    const timer = window.setInterval(() => void printNext(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [paper, printNext])

  return useCallback(() => void printNext(), [printNext])
}
