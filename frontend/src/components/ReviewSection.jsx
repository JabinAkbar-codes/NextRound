import { useState, useEffect } from 'react'
import { Button, Textarea, Loader, Center } from '@mantine/core'
import { motion } from 'framer-motion'
import { IconStarFilled } from '@tabler/icons-react'
import toast from 'react-hot-toast'
import { api } from '../api/client'
import { useAuth } from '../context/AuthContext'
import styles from './ReviewSection.module.css'

const MARQUEE_THRESHOLD = 5 // more than this many reviews -> switch to the scrolling bar

function Stars({ value, size = 15, className }) {
  return (
    <div className={className}>
      {[1, 2, 3, 4, 5].map((n) => (
        <IconStarFilled key={n} size={size} style={{ opacity: n <= value ? 1 : 0.25 }} />
      ))}
    </div>
  )
}

function ReviewCard({ review }) {
  return (
    <div className={styles.card}>
      <Stars value={review.rating} className={styles.cardStars} />
      <div className={styles.cardMessage}>"{review.message}"</div>
      <div className={styles.cardName}>— {review.display_name}</div>
    </div>
  )
}

export default function ReviewSection() {
  const { user } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)

  const loadReviews = () => {
    api.listReviews()
      .then((res) => setReviews(res.reviews))
      .catch(() => {}) // testimonials are a nice-to-have; a failed fetch shouldn't break the page
      .finally(() => setLoadingReviews(false))
  }

  useEffect(() => {
    loadReviews()
  }, [])

  const submit = async () => {
    if (rating === 0) {
      toast.error('Pick a star rating first')
      return
    }
    if (!message.trim()) {
      toast.error('Write a short message with your review')
      return
    }
    setSubmitting(true)
    try {
      const newReview = await api.createReview({ rating, message: message.trim() })
      setReviews((r) => [newReview, ...r])
      setRating(0)
      setMessage('')
      setJustSubmitted(true)
      setTimeout(() => setJustSubmitted(false), 3500)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const useMarquee = reviews.length > MARQUEE_THRESHOLD
  const marqueeList = useMarquee ? [...reviews, ...reviews] : reviews // duplicate for a seamless loop

  return (
    <div className={styles.wrap}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.4 }}
        className={styles.formCard}
      >
        {justSubmitted ? (
          <div className={styles.thanksBox}>
            <div className={styles.thanksTitle}>Thank you for the feedback! 🎉</div>
            <div className={styles.formSubtitle}>Your review just joined the wall below.</div>
          </div>
        ) : (
          <div className={styles.formInner}>
            <div className={styles.formTitle}>Open to your review</div>
            <div className={styles.formSubtitle}>
              Found a bug, loved a feature, or just want to cheer on other students? Rate your
              experience and tell us — every review shows up on the wall below, automatically.
            </div>
            <div className={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={styles.starBtn}
                  onMouseEnter={() => setHoverRating(n)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(n)}
                  aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
                >
                  <IconStarFilled size={26} className={(hoverRating || rating) >= n ? styles.starActive : ''} />
                </button>
              ))}
            </div>
            <Textarea
              placeholder={`What was your experience like${user?.name ? `, ${user.name}` : ''}?`}
              autosize
              minRows={2}
              maxRows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              mb="md"
            />
            <Button radius="xl" onClick={submit} loading={submitting}>
              Submit review
            </Button>
          </div>
        )}
      </motion.div>

      <div className={styles.testimonialSection}>
        <div className={styles.testimonialHeading}>What learners are saying</div>

        {loadingReviews ? (
          <Center py="md"><Loader color="skyblue" size="sm" /></Center>
        ) : reviews.length === 0 ? (
          <div className={styles.emptyNote}>No reviews yet — be the first to share yours above!</div>
        ) : useMarquee ? (
          <div className={styles.marqueeOuter}>
            <div className={styles.marqueeTrack}>
              {marqueeList.map((r, i) => (
                <ReviewCard key={`${r.id}-${i}`} review={r} />
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.staticGrid}>
            {reviews.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.3 }}
              >
                <ReviewCard review={r} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
