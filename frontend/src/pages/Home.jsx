import { useNavigate } from 'react-router-dom'
import { Button } from '@mantine/core'
import { motion } from 'framer-motion'
import {
  IconListCheck, IconCode, IconMicrophone, IconUsers, IconChartBar, IconFileText,
} from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import ReviewSection from '../components/ReviewSection'
import styles from './Home.module.css'

const MODULES = [
  {
    icon: IconListCheck, title: 'MCQ Quiz Engine', guestOk: true,
    body: 'DSA, OS, DBMS, CN, Aptitude and Verbal — every question generated live, at the difficulty you pick, with an AI answer-key check before it ever reaches you.',
    to: '/quiz',
  },
  {
    icon: IconCode, title: 'Live Coding Round', guestOk: true,
    body: 'A real in-browser editor, real execution, real hidden test cases — the same pressure as an actual placement coding round.',
    to: '/coding',
  },
  {
    icon: IconMicrophone, title: 'AI Mock Interview', guestOk: true,
    body: 'A conversational HR or technical interview that adapts to your answers and tells you, honestly, where you rambled.',
    to: '/interview',
  },
  {
    icon: IconUsers, title: 'Multiplayer Battles', guestOk: false,
    body: 'Challenge friends in a live quiz room with a real-time leaderboard. Speed and accuracy both count.',
    to: '/battle',
  },
  {
    icon: IconChartBar, title: 'Analytics Dashboard', guestOk: false,
    body: 'See your strong and weak topics at a glance, tracked across every attempt you make.',
    to: '/analytics',
  },
  {
    icon: IconFileText, title: 'PDF Report Card', guestOk: false,
    body: 'A clean, shareable summary of where you stand — ready to attach to a placement cell submission.',
    to: '/analytics',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <div>
      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <span className={styles.eyebrowless}>No sign-up needed to start practicing</span>
        <h1 className={styles.title}>Placement prep that never runs out of questions</h1>
        <p className={styles.subtitle}>
          NextRound generates fresh MCQs, coding problems and mock interviews on demand —
          practice TCS NQT, Infosys and Wipro-style rounds for as long as you want, at whatever
          difficulty you're ready for.
        </p>
        <div className={styles.ctaRow}>
          <Button size="md" radius="xl" onClick={() => navigate('/quiz')}>
            Start a quiz
          </Button>
          <Button size="md" radius="xl" variant="light" onClick={() => navigate('/coding')}>
            Try a coding round
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        {MODULES.map((m, i) => (
          <motion.button
            key={m.title}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.35, ease: 'easeOut' }}
            className={styles.card}
            style={{ border: 'none', cursor: 'pointer', font: 'inherit' }}
            onClick={() => navigate(m.guestOk || !user?.is_guest ? m.to : '/signup')}
          >
            <div className={styles.iconWrap}>
              <m.icon size={22} stroke={1.75} />
            </div>
            <div className={styles.cardTitle}>{m.title}</div>
            <div className={styles.cardBody}>{m.body}</div>
            {!m.guestOk && <div className={styles.lockedTag}>Requires a free account</div>}
          </motion.button>
        ))}
      </div>

      {user?.is_guest && (
        <div className={styles.strip}>
          <div>
            <div className={styles.stripTitle}>Practicing as a guest</div>
            <div className={styles.stripBody}>
              Your quiz and coding results are saved to this session. Sign up any time to keep
              them permanently and unlock battles, analytics and your report card.
            </div>
          </div>
          <Button radius="xl" onClick={() => navigate('/signup')}>Save my progress</Button>
        </div>
      )}

      <ReviewSection />
    </div>
  )
}
