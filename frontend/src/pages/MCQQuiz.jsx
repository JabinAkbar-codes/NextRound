import { useState, useEffect, useRef, useCallback } from 'react'
import { Select, NumberInput, Button, Loader, Center, Progress } from '@mantine/core'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import TopicSelect from '../components/TopicSelect'
import { playCountdownTick } from '../utils/sound'
import styles from './MCQQuiz.module.css'

const TOPICS = ['DSA', 'OS', 'DBMS', 'CN', 'Aptitude', 'Verbal', 'Cyber Security', 'Machine Learning']

export default function MCQQuiz() {
  const [stage, setStage] = useState('setup') // setup | loading | active | result
  const [topic, setTopic] = useState('DSA')
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState(10)
  const [secondsPerQuestion, setSecondsPerQuestion] = useState(45)

  const [attemptId, setAttemptId] = useState(null)
  const [questions, setQuestions] = useState([])
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(45)
  const [result, setResult] = useState(null)
  const startedAt = useRef(null)

  const submitQuiz = useCallback(async (finalAnswers) => {
    try {
      const elapsed = Math.round((Date.now() - startedAt.current) / 1000)
      const res = await api.submitQuiz({ attempt_id: attemptId, answers: finalAnswers, time_taken_seconds: elapsed })
      setResult(res)
      setStage('result')
    } catch (err) {
      toast.error(err.message)
    }
  }, [attemptId])

  // Per-question countdown; auto-advances (and auto-submits on the last question) on timeout.
  // The last 5 seconds (5,4,3,2,1,0) each get a warning beep.
  useEffect(() => {
    if (stage !== 'active') return
    setTimeLeft(secondsPerQuestion)
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        const next = t - 1
        if (next >= 0 && next <= 5) playCountdownTick(next)
        if (next <= 0) {
          clearInterval(interval)
          goNext(true)
          return 0
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, stage])

  const startQuiz = async () => {
    if (!topic.trim()) {
      toast.error('Please choose or type a topic first')
      return
    }
    setStage('loading')
    try {
      const res = await api.generateQuiz({ topic, difficulty, num_questions: numQuestions })
      setAttemptId(res.attempt_id)
      setQuestions(res.questions)
      setAnswers({})
      setCurrent(0)
      startedAt.current = Date.now()
      setStage('active')
    } catch (err) {
      toast.error(err.message)
      setStage('setup')
    }
  }

  const selectOption = (qid, optId) => {
    setAnswers((a) => ({ ...a, [qid]: optId }))
  }

  const goNext = (auto = false) => {
    setAnswers((latestAnswers) => {
      if (current + 1 >= questions.length) {
        submitQuiz(latestAnswers)
      } else {
        setCurrent((c) => c + 1)
      }
      return latestAnswers
    })
  }

  const recommendedDifficulty = () => {
    if (!result) return 'medium'
    if (result.score >= 80) return difficulty === 'easy' ? 'medium' : 'hard'
    if (result.score < 50) return difficulty === 'hard' ? 'medium' : 'easy'
    return difficulty
  }

  if (stage === 'setup') {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={styles.setupCard}>
        <div className={styles.setupTitle}>Set up your quiz</div>
        <div className={styles.setupSubtitle}>Fresh questions every time, on any topic you choose.</div>
        <TopicSelect label="Topic" presets={TOPICS} value={topic} onChange={setTopic} placeholder="e.g. Kubernetes, System Design, Cyber Security…" />
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
          label="Number of questions"
          description="Choose any number — larger tests take a little longer to generate"
          min={1}
          max={100}
          value={numQuestions}
          onChange={setNumQuestions}
          mb="md"
        />
        <NumberInput
          label="Time per question (seconds)"
          min={10}
          max={300}
          step={5}
          value={secondsPerQuestion}
          onChange={setSecondsPerQuestion}
          mb="xl"
        />
        <Button fullWidth radius="xl" onClick={startQuiz}>Start quiz</Button>
      </motion.div>
    )
  }

  if (stage === 'loading') {
    return (
      <Center style={{ height: '40vh' }}>
        <div className={styles.loadingBox}>
          <Loader color="skyblue" />
          <div>Generating {numQuestions} {difficulty} {topic} question{numQuestions > 1 ? 's' : ''}…</div>
        </div>
      </Center>
    )
  }

  if (stage === 'active') {
    const q = questions[current]
    const urgent = timeLeft <= 10
    return (
      <div className={styles.quizWrap}>
        <div className={styles.topBar}>
          <div className={styles.progressLabel}>Question {current + 1} of {questions.length}</div>
          <div className={clsx(styles.timer, urgent && styles.timerUrgent)}>{timeLeft}s</div>
        </div>
        <Progress value={((current) / questions.length) * 100} color="skyblue" radius="xl" size="sm" mb="lg" />

        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.2 }}
            className={styles.questionCard}
          >
            <div className={styles.questionText}>{q.question}</div>
            <div className={styles.options}>
              {q.options.map((opt) => (
                <button
                  key={opt.id}
                  className={clsx(styles.option, answers[q.id] === opt.id && styles.optionSelected)}
                  onClick={() => selectOption(q.id, opt.id)}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className={styles.navRow}>
          <div />
          <Button radius="xl" onClick={() => goNext(false)} disabled={!answers[q.id]}>
            {current + 1 === questions.length ? 'Submit quiz' : 'Next question'}
          </Button>
        </div>
      </div>
    )
  }

  // result
  return (
    <div className={styles.resultWrap}>
      <motion.div initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }}>
        <div className={styles.scoreCircle}>
          <div className={styles.scoreNum}>{result.score}%</div>
          <div className={styles.scoreLabel}>{result.correct}/{result.total} correct</div>
        </div>
      </motion.div>

      <div style={{ textAlign: 'left', margin: '28px 0' }}>
        {result.breakdown.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.6) }}
            className={styles.breakdownItem}
          >
            <div>Q{i + 1}: {b.is_correct ? <span className={styles.correctText}>Correct</span> : <span className={styles.wrongText}>Incorrect</span>}</div>
            {!b.is_correct && <div style={{ fontSize: 13, color: '#5b7794', marginTop: 4 }}>{b.explanation}</div>}
          </motion.div>
        ))}
      </div>

      <Button
        radius="xl"
        onClick={() => { setDifficulty(recommendedDifficulty()); setStage('setup') }}
      >
        Practice again ({recommendedDifficulty()} recommended)
      </Button>
    </div>
  )
}
