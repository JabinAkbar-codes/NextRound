import { useState, useEffect } from 'react'
import { Button, Loader, Center, Progress } from '@mantine/core'
import { motion } from 'framer-motion'
import { IconDownload, IconTarget, IconTrendingUp, IconCode } from '@tabler/icons-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import styles from './Analytics.module.css'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.dashboard()
      .then(setData)
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false))
  }, [])

  const downloadReport = async () => {
    setDownloading(true)
    try {
      const blob = await fetch(api.reportCardUrl(), {
        headers: { Authorization: `Bearer ${localStorage.getItem('nr_token')}` },
      }).then((r) => {
        if (!r.ok) throw new Error('Could not generate your report card right now.')
        return r.blob()
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'nextround-report-card.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <Center style={{ height: '40vh' }}>
        <Loader color="skyblue" />
      </Center>
    )
  }

  const hasActivity = data && (data.topics.length > 0 || data.coding.length > 0)

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.title}>Your analytics</div>
        <Button
          radius="xl"
          variant="light"
          leftSection={<IconDownload size={16} />}
          onClick={downloadReport}
          loading={downloading}
          disabled={!hasActivity}
        >
          Download report card (PDF)
        </Button>
      </div>

      {!hasActivity ? (
        <div className={styles.section}>
          <div className={styles.empty}>
            No attempts yet — take a quiz or a coding round and your breakdown will show up here.
          </div>
        </div>
      ) : (
        <>
          <div className={styles.statsGrid}>
            {[
              { icon: IconTarget, num: `${data.estimated_percentile}th`, label: 'Estimated percentile' },
              { icon: IconTrendingUp, num: `${data.overall_avg_score}%`, label: 'Overall quiz average' },
              { icon: IconCode, num: data.coding.length, label: 'Coding problems attempted' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className={styles.statCard}
              >
                <div className={styles.statNum}>{s.num}</div>
                <div className={styles.statLabel}>{s.label}</div>
              </motion.div>
            ))}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>Topic breakdown</div>
            {data.topics.map((t) => (
              <div key={t.topic} className={styles.topicRow}>
                <div className={styles.topicName}>{t.topic}</div>
                <Progress value={t.avg_score} color={t.avg_score >= 60 ? 'green' : 'red'} radius="xl" size="md" style={{ flex: 1 }} />
                <div className={styles.topicScore}>{t.avg_score}%</div>
              </div>
            ))}

            <div className={styles.tagRow} style={{ marginTop: 10 }}>
              {data.strong_topics.map((t) => <span key={t} className={styles.tagStrong}>Strong: {t}</span>)}
              {data.weak_topics.map((t) => <span key={t} className={styles.tagWeak}>Needs work: {t}</span>)}
            </div>
          </div>

          {data.coding.length > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Coding rounds</div>
              {data.coding.map((c, i) => (
                <div key={i} className={styles.topicRow}>
                  <div className={clsx(styles.topicName, styles.wide)}>{c.problem_title}</div>
                  <Progress value={(c.passed / Math.max(c.total, 1)) * 100} color="skyblue" radius="xl" size="md" style={{ flex: 1 }} />
                  <div className={styles.topicScore}>{c.passed}/{c.total}</div>
                </div>
              ))}
            </div>
          )}

          {data.interviews_completed > 0 && (
            <div className={styles.section}>
              <div className={styles.sectionTitle}>Mock interviews</div>
              <div style={{ fontSize: 14, color: '#33475e' }}>
                {data.interviews_completed} completed &middot; average score {data.avg_interview_score}/100
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
