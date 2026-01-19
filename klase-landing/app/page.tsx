import Link from 'next/link'

export default function LandingPage() {
  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <div style={styles.logo}>klase.ph</div>
        <p style={styles.subtitle}>Choose your portal to continue</p>

        <div style={styles.grid}>
          <PortalCard title="Student Portal" href="https://student.klase.ph" icon="🎓" desc="Access classes, modules, grades, and messages" />
          <PortalCard title="Teacher Portal" href="https://teachers.klase.ph" icon="👩‍🏫" desc="Manage sections, content, grading, and live sessions" />
          <PortalCard title="Admin Portal" href="https://admin.klase.ph" icon="🏛️" desc="Oversee admissions, data, and communications" />
        </div>

        <p style={styles.help}>Having trouble? Contact support@klase.ph</p>
      </div>
    </main>
  )
}

function PortalCard({ title, href, icon, desc }: { title: string; href: string; icon: string; desc: string }) {
  return (
    <Link href={href} style={styles.portal}>
      <div style={styles.icon}>{icon}</div>
      <div style={styles.portalTitle}>{title}</div>
      <div style={styles.portalDesc}>{desc}</div>
    </Link>
  )
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #2563eb, #0ea5e9)',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 960,
    background: 'white',
    borderRadius: 16,
    padding: 32,
    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
    textAlign: 'center' as const,
  },
  logo: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: 0.5,
  },
  subtitle: {
    marginTop: 8,
    color: '#374151',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
    marginTop: 24,
  },
  portal: {
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: 16,
    textDecoration: 'none',
    color: '#111827',
    transition: 'transform 120ms ease, box-shadow 120ms ease',
    background: '#ffffff',
    display: 'block',
  },
  icon: {
    fontSize: 28,
  },
  portalTitle: {
    fontWeight: 700,
    marginTop: 8,
  },
  portalDesc: {
    color: '#4b5563',
    marginTop: 6,
    fontSize: 14,
  },
  help: {
    marginTop: 28,
    color: '#6b7280',
    fontSize: 14,
  },
}

