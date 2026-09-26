import { useState, useEffect, useRef } from 'react'
import { Select, NumberInput, Button, Loader, Center } from '@mantine/core'
import { motion } from 'framer-motion'
import { IconCheck, IconX, IconPlayerPlay, IconClockHour4 } from '@tabler/icons-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import TopicSelect from '../components/TopicSelect'
import { playCountdownTick } from '../utils/sound'
import styles from './CodingRound.module.css'

const TOPICS = ['Arrays', 'Strings', 'Recursion', 'Linked Lists', 'Trees', 'Dynamic Programming', 'Graphs', 'Databases (SQL)']
const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'cpp', label: 'C++' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
]

function formatClock(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0')
  const s = Math.floor(seconds % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function CodingRound() {
  const [stage, setStage] = useState('setup') // setup | loading | active
  const [topic, setTopic] = useState('Arrays')
  const [difficulty, setDifficulty] = useState('medium')
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(0) // 0 = no limit

  const [attemptId, setAttemptId] = useState(null)
  const [problem, setProblem] = useState(null)
  const [language, setLanguage] = useState('python')
  const [code, setCode] = useState('')
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(null)
  const [timeUp, setTimeUp] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (stage !== 'active' || !timeLimitMinutes) return
    setSecondsLeft(timeLimitMinutes * 60)
    setTimeUp(false)
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        const next = s - 1
        if (next >= 0 && next <= 5) playCountdownTick(next)
        if (next <= 0) {
          clearInterval(timerRef.current)
          setTimeUp(true)
          toast.error("Time's up! You can still review your code, but Run is now locked.")
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(timerRef.current)
  }, [stage, timeLimitMinutes])

  const generate = async () => {
    if (!topic.trim()) {
      toast.error('Please choose or type a topic first')
      return
    }
    setStage('loading')
    try {
      const res = await api.generateProblem({ topic: topic.toLowerCase(), difficulty })
      setAttemptId(res.attempt_id)
      setProblem(res)
      setLanguage('python')
      setCode(res.starter_code?.python || '')
      setResult(null)
      setStage('active')
    } catch (err) {
      toast.error(err.message)
      setStage('setup')
    }
  }

  const changeLanguage = (lang) => {
    setLanguage(lang)
    setCode(problem?.starter_code?.[lang] || '')
  }

  const runSubmission = async () => {
    if (timeUp) return
    setRunning(true)
    setResult(null)
    try {
      const res = await api.runCode({ attempt_id: attemptId, language, source_code: code })
      setResult(res)
      if (res.passed === res.total) toast.success('All test cases passed!')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setRunning(false)
    }
  }

  if (stage === 'setup') {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={styles.setupCard}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Coding round</div>
        <div style={{ fontSize: 14, color: '#5b7794', marginBottom: 24 }}>
          A fresh problem, a real editor, real test cases — on any topic.
        </div>
        <TopicSelect label="Topic" presets={TOPICS} value={topic} onChange={setTopic} placeholder="e.g. Operating Systems, Kubernetes basics…" />
        <Select
          label="Difficulty"
          data={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]}
          value={difficulty}
          onChange={setDifficulty}
          mt="md"
          mb="md"
          allowDeselect={false}
        />
        <NumberInput
          label="Time limit (minutes)"
          description="0 = no time limit"
          min={0}
          max={180}
          value={timeLimitMinutes}
          onChange={setTimeLimitMinutes}
          mb="xl"
        />
        <Button fullWidth radius="xl" onClick={generate}>Generate problem</Button>
      </motion.div>
    )
  }

  if (stage === 'loading') {
    return (
      <Center style={{ height: '40vh' }}>
        <div className={styles.loadingBox}>
          <Loader color="skyblue" />
          <div>Writing a {difficulty} {topic.toLowerCase()} problem…</div>
        </div>
      </Center>
    )
  }

  return (
    <div>
      {timeLimitMinutes > 0 && secondsLeft !== null && (
        <div className={clsx(styles.timerBar, secondsLeft <= 60 && styles.timerBarUrgent)}>
          <IconClockHour4 size={16} />
          {timeUp ? "Time's up" : formatClock(secondsLeft)}
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.panel}>
          <div className={styles.problemTitle}>{problem.title}</div>
          <div className={styles.problemBody}>{problem.statement}</div>
        </div>

        <div className={styles.panel}>
          <div className={styles.editorTop}>
            <Select
              data={LANGUAGES}
              value={language}
              onChange={changeLanguage}
              w={160}
              allowDeselect={false}
            />
            <Button
              radius="xl"
              size="sm"
              leftSection={<IconPlayerPlay size={16} />}
              loading={running}
              onClick={runSubmission}
              disabled={timeUp}
            >
              Run
            </Button>
          </div>
          <textarea
            className={styles.editor}
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            disabled={timeUp}
          />

          {result && (
            <div className={styles.resultsWrap}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={styles.summaryBar}
                style={{ color: result.passed === result.total ? '#2e8b57' : '#1a2b40' }}
              >
                {result.passed} / {result.total} test cases passed
              </motion.div>
              {result.results.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }} className={styles.testCase}>
                  {r.passed ? <IconCheck size={16} className={styles.pass} /> : <IconX size={16} className={styles.fail} />}
                  <span>Test case {i + 1}{r.status && r.status !== 'Accepted' ? ` — ${r.status}` : ''}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: 20 }}>
        <Button variant="light" radius="xl" onClick={() => setStage('setup')}>New problem</Button>
      </div>
    </div>
  )
}
