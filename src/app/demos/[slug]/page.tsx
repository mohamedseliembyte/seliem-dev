import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getDemoBySlug, demos } from '@/data/demos'
import DemoPage from '@/components/demos/DemoPage'

interface Props {
  params: { slug: string }
  searchParams?: { embed?: string }
}

export function generateStaticParams() {
  return demos.map((d) => ({ slug: d.slug }))
}

export function generateMetadata({ params }: Props) {
  const demo = getDemoBySlug(params.slug)
  if (!demo) return {}
  return {
    title: `${demo.name} — Live Demo · Seliem.dev`,
    description: demo.cardDescription,
  }
}

export default function DemoRoutePage({ params, searchParams }: Props) {
  const demo = getDemoBySlug(params.slug)
  if (!demo) notFound()

  const embed = searchParams?.embed === 'true'

  return (
    <>
      {/* Back bar — hidden when loaded inside an iframe */}
      {!embed && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-md border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Seliem.dev
          </Link>
          <a
            href="/#contact"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold gold-gradient text-black hover:shadow-md hover:shadow-[#c9a84c]/20 transition-all"
          >
            Get This Website
          </a>
        </div>
      )}

      <div className={embed ? '' : 'pt-[52px]'}>
        <DemoPage demo={demo} />
      </div>
    </>
  )
}
