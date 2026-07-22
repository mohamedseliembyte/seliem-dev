import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getDemoBySlug, demos } from '@/data/demos'
import DemoPage from '@/components/demos/DemoPage'

interface Props {
  // Next 16 passes these as Promises — reading them synchronously yields
  // undefined, which used to send every demo page to notFound().
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ embed?: string }>
}

export function generateStaticParams() {
  return demos.map((d) => ({ slug: d.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const demo = getDemoBySlug(slug)
  if (!demo) return {}
  return {
    title: `${demo.name} — Live Demo · Seliem.dev`,
    description: demo.cardDescription,
  }
}

export default async function DemoRoutePage({ params, searchParams }: Props) {
  const { slug } = await params
  const demo = getDemoBySlug(slug)
  if (!demo) notFound()

  const embed = (await searchParams)?.embed === 'true'

  return (
    <>
      {/* The root layout's chat widget would otherwise render a second time
          inside the iframe, stacked under the host page's own widget. */}
      {embed && (
        <style>{`[data-chat-widget]{display:none !important}`}</style>
      )}

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
          <Link
            href="/#contact"
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold gold-gradient text-black hover:shadow-md hover:shadow-[#c9a84c]/20 transition-all"
          >
            Get This Website
          </Link>
        </div>
      )}

      <div className={embed ? '' : 'pt-[52px]'}>
        <DemoPage demo={demo} />
      </div>
    </>
  )
}
