import { useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { Button, Avatar, Menu, Burger, Drawer, Stack, Divider } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { IconLock, IconChevronDown, IconLogout } from '@tabler/icons-react'
import clsx from 'clsx'
import { useAuth } from '../context/AuthContext'
import Footer from './Footer'
import Logo from './Logo'
import styles from './Layout.module.css'

const NAV_ITEMS = [
  { to: '/', label: 'Home', guestOk: true },
  { to: '/quiz', label: 'MCQ Quiz', guestOk: true },
  { to: '/coding', label: 'Coding Round', guestOk: true },
  { to: '/interview', label: 'Mock Interview', guestOk: true },
  { to: '/battle', label: 'Battle', guestOk: false },
  { to: '/analytics', label: 'Analytics', guestOk: false },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [drawerOpened, { toggle: toggleDrawer, close: closeDrawer }] = useDisclosure(false)

  // Close the mobile drawer automatically whenever the route changes
  useEffect(() => {
    closeDrawer()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])

  const linkClass = (item) => ({ isActive }) =>
    clsx(styles.link, isActive && styles.linkActive, user?.is_guest && !item.guestOk && styles.linkLocked)

  return (
    <div className={styles.shell}>
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <NavLink to="/" className={styles.logoLink}>
            <Logo size={26} />
          </NavLink>

          <nav className={styles.links}>
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass(item)}>
                {item.label}
                {user?.is_guest && !item.guestOk && <IconLock size={12} style={{ marginLeft: 4, verticalAlign: -1 }} />}
              </NavLink>
            ))}
          </nav>

          <div className={styles.desktopAction}>
            {user?.is_guest ? (
              <Button size="sm" radius="xl" onClick={() => navigate('/signup')}>
                Sign up free
              </Button>
            ) : (
              <Menu shadow="md" width={180} position="bottom-end">
                <Menu.Target>
                  <Button variant="subtle" size="sm" radius="xl" rightSection={<IconChevronDown size={14} />}>
                    <Avatar size={22} radius="xl" mr={8} color="skyblue">
                      {(user?.name || 'U')[0].toUpperCase()}
                    </Avatar>
                    {user?.name}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconLogout size={14} />} onClick={logout}>
                    Log out
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            )}
          </div>

          <Burger
            opened={drawerOpened}
            onClick={toggleDrawer}
            className={styles.burger}
            aria-label="Toggle navigation menu"
            color="#2c5f96"
          />
        </div>
      </header>

      <Drawer
        opened={drawerOpened}
        onClose={closeDrawer}
        position="right"
        size="78%"
        padding="lg"
        title={<Logo size={22} />}
        classNames={{ content: styles.drawerContent, header: styles.drawerHeader }}
      >
        <Stack gap={2}>
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={clsx(styles.drawerLink)}>
              {({ isActive }) => (
                <span className={clsx(styles.drawerLinkInner, isActive && styles.drawerLinkActive)}>
                  {item.label}
                  {user?.is_guest && !item.guestOk && <IconLock size={13} />}
                </span>
              )}
            </NavLink>
          ))}
        </Stack>

        <Divider my="lg" />

        {user?.is_guest ? (
          <Button fullWidth radius="xl" onClick={() => navigate('/signup')}>
            Sign up free
          </Button>
        ) : (
          <Stack gap="sm">
            <div className={styles.drawerUser}>
              <Avatar size={30} radius="xl" color="skyblue">
                {(user?.name || 'U')[0].toUpperCase()}
              </Avatar>
              <span>{user?.name}</span>
            </div>
            <Button fullWidth variant="light" radius="xl" leftSection={<IconLogout size={14} />} onClick={logout}>
              Log out
            </Button>
          </Stack>
        )}
      </Drawer>

      <main className={styles.main}>
        <div className="container">{children}</div>
      </main>

      {location.pathname === '/' && <Footer />}
    </div>
  )
}
