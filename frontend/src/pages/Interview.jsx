import { useState, useRef, useEffect } from 'react'
import { Select, Button, Textarea, ActionIcon, Loader, Center, Tooltip } from '@mantine/core'
import { motion } from 'framer-motion'
import { IconMicrophone, IconMicrophoneOff, IconSend } from '@tabler/icons-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import TopicSelect from '../components/TopicSelect'
import styles from './Interview.module.css'

const ROLES = ['Software Engineer', 'Data Analyst', 'System Administrator', 'QA Engineer', 'Product Support Engineer', 'Cyber Security Analyst']

function useSpeechRecognition(onResult) {
  const recognitionRef = useRef(null)
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    setSupported(true)
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onresult = (e) => onResult(e.results[0][0].transcript)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggle = () => {
    if (!recognitionRef.current) return
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.start()
      setListening(true)
    }
  }

  return { listening, supported, toggle }
}

export default function Interview() {
  const [stage, setStage] = useState('setup') // setup | active | done
  const [role, setRole] = useState('Software Engineer')
  const [mode, setMode] = useState('technical')
  const [sessionId, setSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [report, setReport] = useState(null)
  const scrollRef = useRef(null)

  const { listening, supported, toggle } = useSpeechRecognition((text) => setDraft((d) => (d ? d + ' ' + text : text)))

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const start = async () => {
    if (!role.trim()) {
      toast.error('Please choose or type a target role first')
      return
    }
    setBusy(true)
    try {
      const res = await api.startInterview({ role, mode })
      setSessionId(res.session_id)
      setMessages([{ role: 'assistant', content: res.message }])
      setStage('active')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  const send = async () => {
    if (!draft.trim()) return
    const userMsg = draft.trim()
    setMessages((m) => [...m, { role: 'user', content: userMsg }])
    setDraft('')
    setBusy(true)
    try {
      const res = await api.replyInterview({ session_id: sessionId, message: userMsg })
      setMessages((m) => [...m, { role: 'assistant', content: res.message, feedback: res.feedback_on_last_answer }])
      if (res.ended) {
        setReport(res.report)
        setStage('done')
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (stage === 'setup') {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={styles.setupCard}>
        <div style={{ fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>Mock interview</div>
        <div style={{ fontSize: 14, color: '#5b7794', marginBottom: 24 }}>
          A conversational round that adapts to your answers — type or speak.
        </div>
        <TopicSelect label="Target role" presets={ROLES} value={role} onChange={setRole} placeholder="e.g. DevOps Engineer, Embedded Systems…" />
        <Select
          label="Interview type"
          data={[{ value: 'technical', label: 'Technical' }, { value: 'hr', label: 'HR / Behavioral' }]}
          value={mode}
          onChange={setMode}
          mt="md"
          mb="xl"
          allowDeselect={false}
        />
        <Button fullWidth radius="xl" onClick={start} loading={busy}>Start interview</Button>
      </motion.div>
    )
  }

  if (stage === 'done') {
    return (
      <div className={styles.chatWrap}>
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={styles.reportCard}>
          <div className={styles.reportScore}>{report.overall_score}/100</div>
          <div className={styles.reportSection}>
            <div className={styles.reportSectionTitle}>Summary</div>
            <div style={{ fontSize: 14, color: '#33475e' }}>{report.summary}</div>
          </div>
          <div className={styles.reportSection}>
            <div className={styles.reportSectionTitle}>Strengths</div>
            <ul className={styles.reportList}>{report.strengths?.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div className={styles.reportSection}>
            <div className={styles.reportSectionTitle}>Areas to improve</div>
            <ul className={styles.reportList}>{report.areas_to_improve?.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </div>
          <div className={styles.reportSection}>
            <div className={styles.reportSectionTitle}>Communication</div>
            <div style={{ fontSize: 14, color: '#33475e' }}>{report.communication_notes}</div>
          </div>
        </motion.div>
        <Center mt="lg">
          <Button radius="xl" variant="light" onClick={() => setStage('setup')}>Start another interview</Button>
        </Center>
      </div>
    )
  }

  return (
    <div className={styles.chatWrap}>
      <div className={styles.messages}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column' }}>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant}`}
            >
              {m.content}
            </motion.div>
            {m.feedback && <div className={styles.feedbackTag}>{m.feedback}</div>}
          </div>
        ))}
        {busy && <Loader color="skyblue" size="sm" />}
        <div ref={scrollRef} />
      </div>

      <div className={styles.inputRow}>
        <Textarea
          placeholder="Type your answer…"
          autosize
          minRows={1}
          maxRows={4}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          style={{ flex: 1 }}
        />
        {supported && (
          <Tooltip label={listening ? 'Stop recording' : 'Speak your answer'}>
            <ActionIcon size={38} radius="xl" variant={listening ? 'filled' : 'light'} color="skyblue" onClick={toggle}>
              {listening ? <IconMicrophoneOff size={18} /> : <IconMicrophone size={18} />}
            </ActionIcon>
          </Tooltip>
        )}
        <ActionIcon size={38} radius="xl" color="skyblue" variant="filled" onClick={send} disabled={busy || !draft.trim()}>
          <IconSend size={16} />
        </ActionIcon>
      </div>
    </div>
  )
}
