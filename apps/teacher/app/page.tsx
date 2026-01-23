import Link from 'next/link'
import BrandLogo from '@/components/brand/BrandLogo'
import Button from '@/components/ui/Button'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <BrandLogo size="lg" />
          </div>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          MSU Teacher Portal
        </h1>
        <p className="text-xl text-white/90 mb-8 max-w-md mx-auto">
          Manage your classes, create content, and engage with students
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/login">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              Sign In
            </Button>
          </Link>
          <Link href="/teacher-register">
            <Button variant="outline" size="lg" className="w-full sm:w-auto bg-white/10 text-white border-white hover:bg-white hover:text-primary">
              Register as Teacher
            </Button>
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <span className="material-symbols-outlined text-4xl mb-3">
              groups
            </span>
            <h3 className="font-semibold mb-2">Manage Classes</h3>
            <p className="text-sm text-white/80">
              Organize sections and track student progress
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <span className="material-symbols-outlined text-4xl mb-3">
              book_2
            </span>
            <h3 className="font-semibold mb-2">Create Content</h3>
            <p className="text-sm text-white/80">
              Build modules, lessons, and assessments
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <span className="material-symbols-outlined text-4xl mb-3">
              grading
            </span>
            <h3 className="font-semibold mb-2">Grade & Feedback</h3>
            <p className="text-sm text-white/80">
              Review submissions and provide feedback
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
