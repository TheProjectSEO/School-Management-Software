import Card from './Card'

interface PlaceholderPageProps {
  title: string
  description: string
  icon: string
}

export default function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
          {title}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-1">
          {description}
        </p>
      </div>

      <Card>
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 text-primary mb-6">
            <span className="material-symbols-outlined text-5xl">
              {icon}
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-3">
            Coming Soon
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            This feature is currently under development. Check back soon!
          </p>
        </div>
      </Card>
    </div>
  )
}
