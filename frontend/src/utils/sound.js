// A tiny synthesized beep via the Web Audio API — no external audio file to
// load or ship. Used for the last-5-seconds countdown warning on timed
// rounds. Fails silently if the browser blocks audio (e.g. before the user
// has interacted with the page yet) since a missing beep should never break
// the quiz itself.
let audioCtx = null

export function playBeep({ frequency = 880, duration = 0.12, volume = 0.18 } = {}) {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) return
      audioCtx = new AudioContextClass()
    }
    if (audioCtx.state === 'suspended') audioCtx.resume()

    const oscillator = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.value = volume
    oscillator.connect(gain)
    gain.connect(audioCtx.destination)
    oscillator.start()
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration)
    oscillator.stop(audioCtx.currentTime + duration)
  } catch {
    // audio is a nice-to-have, never let it break the timer
  }
}

export function playCountdownTick(secondsLeft) {
  if (secondsLeft > 0) {
    playBeep({ frequency: 880, duration: 0.1, volume: 0.16 })
  } else {
    playBeep({ frequency: 560, duration: 0.32, volume: 0.2 }) // lower, longer tone at zero
  }
}
