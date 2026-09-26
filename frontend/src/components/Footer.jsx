import { IconBrandLinkedin, IconBrandGithub, IconMail } from '@tabler/icons-react'
import styles from './Footer.module.css'

// Replace these with your real profile / contact links
const SOCIAL_LINKS = [
  { href: 'https://linkedin.com/in/your-profile', icon: IconBrandLinkedin, label: 'LinkedIn' },
  { href: 'https://github.com/your-username', icon: IconBrandGithub, label: 'GitHub' },
  { href: 'mailto:you@example.com', icon: IconMail, label: 'Email' },
]

export default function Footer() {
  const year = new Date().getFullYear() // always the current year, no hardcoding

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <span className={styles.copyright}>© {year} NextRound. All rights reserved.</span>
        <div className={styles.social}>
          {SOCIAL_LINKS.map(({ href, icon: Icon, label }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className={styles.iconLink} aria-label={label}>
              <Icon size={17} stroke={1.75} />
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
