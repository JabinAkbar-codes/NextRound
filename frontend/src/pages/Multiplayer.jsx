import { useState, useRef, useEffect, useCallback } from 'react'
import { Select, NumberInput, TextInput, Button, Loader, Center } from '@mantine/core'
import { motion, AnimatePresence } from 'framer-motion'
import { IconTrophy } from '@tabler/icons-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { api, wsUrl, getToken } from '../api/client'
import { useAuth } from '../context/AuthContext'
import TopicSelect from '../components/TopicSelect'
import styles from './Multiplayer.module.css'

const TOPICS = ['DSA', 'OS', 'DBMS', 'CN', 'Aptitude', 'Verbal', 'Cyber Security']

export default function Multiplayer() {
  const { user } = useAuth()
  const [tab, setTab] = useState('create')
  const [topic, setTopic] = useState('DSA')
  const [difficulty, setDifficulty] = useState('medium')
  const [numQuestions, setNumQuestions] = useState(8)
  const [joinCode, setJoinCode] = useState('')

  const [stage, setStage] = useState('form') // form | waiting | battling | finished
  const [code, setCode] = useState(null)
  const [isHost, setIsHost] = useState(false)
  const [players, setPlayers] = useState([])
  const [questions, setQuestions] = useState([])
  const [currentQ, setCurrentQ] = useState(0)
  const [selected, setSelected] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const questionStartRef = useRef(null)
  const wsRef = useRef(null)

  const connect = useCallback((roomCode) => {
    const ws = new WebSocket(wsUrl(roomCode))
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.type === 'player_joined') setPlayers(data.players)
      if (data.type === 'player_left') setPlayers((p) => p.filter((id) => id !== data.user_id))
      if (data.type === 'battle_started') {
        setQuestions(data.questions)
        setCurrentQ(0)
        setSelected(null)
        setStage('battling')
        questionStartRef.current = Date.now()
      }
      if (data.type === 'leaderboard_update') setLeaderboard(data.leaderboard)
      if (data.type === 'battle_finished') {
        setLeaderboard(data.leaderboard)
        setStage('finished')
      }
    }
    ws.onerror = () => toast.error('Connection to the battle room was lost.')
    wsRef.current = ws
  }, [])

  useEffect(() => () => wsRef.current?.close(), [])

  const createRoom = async () => {
    if (!topic.trim()) {
      toast.error('Please choose or type a topic first')
      return
    }
    try {
      const res = await api.createRoom({ topic, difficulty, num_questions: numQuestions })
      setCode(res.code)
      setIsHost(true)
      setStage('waiting')
      connect(res.code)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const joinRoom = async () => {
    try {
      const res = await api.joinRoom({ code: joinCode.toUpperCase() })
      setCode(res.code)
      setIsHost(false)
      setStage('waiting')
      connect(res.code)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const startBattle = () => wsRef.current?.send(JSON.stringify({ type: 'start' }))
  const finishBattle = () => wsRef.current?.send(JSON.stringify({ type: 'finish' }))

  const answer = (optId) => {
    if (selected) return
    setSelected(optId)
    const q = questions[currentQ]
    const timeMs = Date.now() - questionStartRef.current
    wsRef.current?.send(JSON.stringify({ type: 'answer', question_id: q.id, selected: optId, time_ms: timeMs }))
    setTimeout(() => {
      if (currentQ + 1 < questions.length) {
        setCurrentQ((c) => c + 1)
        setSelected(null)
        questionStartRef.current = Date.now()
      } else if (isHost) {
        finishBattle()
      }
    }, 1200)
  }

  if (stage === 'form') {
    return (
      <div className={styles.setupCard}>
        <div className={styles.tabs}>
          <div className={clsx(styles.tab, tab === 'create' && styles.tabActive)} onClick={() => setTab('create')}>Create a room</div>
          <div className={clsx(styles.tab, tab === 'join' && styles.tabActive)} onClick={() => setTab('join')}>Join a room</div>
        </div>

        {tab === 'create' ? (
          <>
            <TopicSelect label="Topic" presets={TOPICS} value={topic} onChange={setTopic} placeholder="e.g. Cyber Security, Kubernetes…" />
            <Select
              label="Difficulty"
              data={[{ value: 'easy', label: 'Easy' }, { value: 'medium', label: 'Medium' }, { value: 'hard', label: 'Hard' }]}
              value={difficulty}
              onChange={setDifficulty}
              mt="md"
              mb="md"
              allowDeselect={false}
            />
            <NumberInput label="Number of questions" min={1} max={100} value={numQuestions} onChange={setNumQuestions} mb="xl" />
            <Button fullWidth radius="xl" onClick={createRoom}>Create battle room</Button>
          </>
        ) : (
          <>
            <TextInput
              label="Room code"
              placeholder="e.g. 7F3K2Q"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              mb="xl"
            />
            <Button fullWidth radius="xl" onClick={joinRoom} disabled={joinCode.length < 4}>Join battle</Button>
          </>
        )}
      </div>
    )
  }

  if (stage === 'waiting') {
    return (
      <div className={styles.roomWrap}>
        <div style={{ color: '#5b7794' }}>Share this code with your friends</div>
        <div className={styles.codeBadge}>{code}</div>
        <div className={styles.playerRow}>
          {players.map((p) => <div key={p} className={styles.playerChip}>{p === user?.user_id ? `${user.name} (you)` : 'Player'}</div>)}
        </div>
        {isHost ? (
          <Button radius="xl" onClick={startBattle} disabled={players.length < 1}>Start battle</Button>
        ) : (
          <Center><Loader size="sm" color="skyblue" mr={8} /> Waiting for host to start…</Center>
        )}
      </div>
    )
  }

  if (stage === 'battling') {
    const q = questions[currentQ]
    return (
      <div className={styles.roomWrap} style={{ maxWidth: 640 }}>
        <div style={{ color: '#5b7794', marginBottom: 12 }}>Question {currentQ + 1} of {questions.length}</div>
        <AnimatePresence mode="wait">
          <motion.div
            key={q.id}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            className={styles.questionCard}
          >
            <div style={{ fontWeight: 600, fontSize: 16 }}>{q.question}</div>
            <div className={styles.options}>
              {q.options.map((opt) => (
                <button
                  key={opt.id}
                  className={clsx(styles.option, selected === opt.id && styles.optionSelected)}
                  onClick={() => answer(opt.id)}
                  disabled={!!selected}
                >
                  {opt.text}
                </button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className={styles.leaderboard}>
          {leaderboard.map((row, i) => (
            <div key={row.user_id} className={styles.lbRow}>
              <span className={styles.lbRank}>#{i + 1}</span>
              <span>{row.user_id === user?.user_id ? `${user.name} (you)` : 'Player'}</span>
              <span>{row.score} pts</span>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // finished
  return (
    <div className={styles.roomWrap}>
      <IconTrophy size={40} color="#3d8ed9" />
      <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, margin: '10px 0 20px' }}>Battle finished!</div>
      <div className={styles.leaderboard}>
        {leaderboard.map((row, i) => (
          <div key={row.user_id} className={styles.lbRow}>
            <span className={styles.lbRank}>#{i + 1}</span>
            <span>{row.user_id === user?.user_id ? `${user.name} (you)` : 'Player'}</span>
            <span>{row.score} pts</span>
          </div>
        ))}
      </div>
      <Button mt="lg" radius="xl" onClick={() => setStage('form')}>Back to lobby</Button>
    </div>
  )
}
