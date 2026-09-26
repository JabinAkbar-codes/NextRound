import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TextInput, PasswordInput, Button, Stack } from '@mantine/core'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import styles from './Auth.module.css'

export default function Auth({ mode }) {
  const isSignup = mode === 'signup'
  const { upgrade, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)

  const lockedFeature = location.state?.reason === 'locked-feature'

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      if (isSignup) {
        await upgrade(form)
        toast.success('Account created — your guest progress has been saved!')
      } else {
        await login(form)
        toast.success('Welcome back!')
      }
      navigate('/')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.wrap}>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className={styles.title}>{isSignup ? 'Create your account' : 'Log in'}</div>
      <div className={styles.subtitle}>
        {isSignup
          ? 'Keep your quiz history, unlock multiplayer battles and your analytics dashboard.'
          : 'Log back in to pick up where you left off.'}
      </div>

      {lockedFeature && (
        <div className={styles.notice}>
          That feature needs a full account — it only takes a few seconds to set one up.
        </div>
      )}

      <form onSubmit={submit}>
        <Stack gap="md">
          {isSignup && (
            <TextInput label="Name" placeholder="Your name" required value={form.name} onChange={set('name')} />
          )}
          <TextInput label="Email" placeholder="you@example.com" type="email" required value={form.email} onChange={set('email')} />
          <PasswordInput label="Password" placeholder="At least 8 characters" required minLength={8} value={form.password} onChange={set('password')} />
          <Button type="submit" radius="xl" loading={busy} fullWidth mt="sm">
            {isSignup ? 'Create account' : 'Log in'}
          </Button>
        </Stack>
      </form>

      <div className={styles.switchRow}>
        {isSignup ? (
          <>Already have an account? <span className={styles.switchLink} onClick={() => navigate('/login')}>Log in</span></>
        ) : (
          <>New here? <span className={styles.switchLink} onClick={() => navigate('/signup')}>Create an account</span></>
        )}
      </div>
      </motion.div>
    </div>
  )
}
