import { useEffect, useMemo, useState } from 'react'
import { Etapa } from '@/services/etapas'
import { Plano } from '@/services/planos'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Flame, ArrowRight, Lock, Loader2, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'
import pb from '@/lib/pocketbase/client'

interface HistoricoAcao {
  id: string
  created: string
}

interface Props {
  plano: Plano | null
  etapas: Etapa[]
  readOnly?: boolean
}

export function ProgressMap({ plano, etapas, readOnly }: Props) {
  const [historico, setHistorico] = useState<HistoricoAcao[]>([])

  const fetchHistorico = async () => {
    try {
      const records = await pb.collection('historico_acoes').getFullList<HistoricoAcao>({
        sort: '-created',
      })
      setHistorico(records)
    } catch (e) {
      // Ignore errors silently
    }
  }

  useEffect(() => {
    fetchHistorico()
  }, [])

  useRealtime('historico_acoes', () => {
    fetchHistorico()
  })

  const streakDays = useMemo(() => {
    if (!historico.length) return 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayMs = today.getTime()

    const activeDates = historico.map((h) => {
      const d = new Date(h.created)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    })

    const uniqueActive = Array.from(new Set(activeDates)).sort((a, b) => b - a)

    let streak = 0
    let checkDay = todayMs

    if (uniqueActive.includes(todayMs)) {
      streak = 1
      checkDay -= 86400000
      while (uniqueActive.includes(checkDay)) {
        streak++
        checkDay -= 86400000
      }
    } else if (uniqueActive.includes(todayMs - 86400000)) {
      streak = 1
      checkDay = todayMs - 86400000 * 2
      while (uniqueActive.includes(checkDay)) {
        streak++
        checkDay -= 86400000
      }
    }

    return streak
  }, [historico])

  const { progress, nextStep, sortedEtapas } = useMemo(() => {
    if (!etapas || etapas.length === 0) return { progress: 0, nextStep: null, sortedEtapas: [] }

    const completed = etapas.filter((e) => e.status === 'concluido').length
    const progress = Math.round((completed / etapas.length) * 100)

    const sorted = [...etapas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    const nextStep = sorted.find((e) => e.status !== 'concluido')

    return { progress, nextStep, sortedEtapas: sorted }
  }, [etapas])

  if (!plano || etapas.length === 0) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/20 border-dashed border-2 border-slate-200 dark:border-slate-800">
        <Target className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
        <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">
          Mapa de Progresso
        </h3>
        <p className="text-slate-500 dark:text-slate-400 mb-4">
          {readOnly
            ? 'Seu plano ainda não foi criado. Aguarde contato da Adapta.'
            : 'Nenhum plano ativo encontrado. Gere um plano no cabeçalho para visualizar e acompanhar o progresso.'}
        </p>
        {!readOnly && (
          <Button variant="outline" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Ir para o Cabeçalho
          </Button>
        )}
      </Card>
    )
  }

  const handleStepClick = (id: string) => {
    const el = document.getElementById(`kanban-col-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })

      const card = el.firstElementChild
      if (card) {
        card.classList.add(
          'ring-4',
          'ring-indigo-500',
          'ring-offset-2',
          'transition-all',
          'duration-500',
        )
        setTimeout(() => {
          card.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2')
        }, 2000)
      }
    }
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-pink-50 dark:from-indigo-950/30 dark:to-pink-950/30 rounded-3xl p-8 mb-8 space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Mapa de Progresso</h2>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-4 py-2 rounded-full shadow-sm">
          <Flame className="w-6 h-6 text-red-500" />
          <span className="text-red-500 font-bold">{streakDays}</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold text-gray-600 dark:text-gray-400">Seu Progresso</span>
          <span className="font-bold text-gray-600 dark:text-gray-400">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-indigo-500 to-green-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center w-full py-4 overflow-x-auto hide-scrollbar px-2 min-h-[140px]">
          {sortedEtapas.map((etapa, index) => {
            const isCompleted = etapa.status === 'concluido'
            const isInProgress = etapa.status === 'em_progresso'
            const isNotStarted = etapa.status === 'a_fazer'
            const fillPercentage = isCompleted ? '100%' : isInProgress ? '50%' : '0%'

            return (
              <div
                key={etapa.id}
                className="flex flex-col md:flex-row items-center relative group w-full md:w-auto"
              >
                <div className="relative flex flex-col items-center">
                  <button
                    onClick={() => handleStepClick(etapa.id)}
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center shadow-sm z-10 transition-all duration-200 hover:scale-110 shrink-0',
                      isCompleted && 'bg-green-500 text-white',
                      isInProgress && 'bg-blue-500 text-white animate-pulse',
                      isNotStarted &&
                        'bg-white border-2 border-gray-300 text-gray-400 dark:bg-slate-800 dark:border-gray-600 dark:text-gray-500',
                    )}
                    title={etapa.titulo}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5 stroke-[3]" />
                    ) : isInProgress ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                  </button>

                  <span
                    className={cn(
                      'absolute top-12 text-[10px] font-bold text-center w-24 truncate hidden md:block',
                      isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : isInProgress
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400',
                    )}
                  >
                    {etapa.titulo}
                  </span>
                  <span
                    className={cn(
                      'md:hidden text-[10px] font-bold text-center mt-1 mb-1',
                      isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : isInProgress
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-gray-400',
                    )}
                  >
                    {etapa.titulo}
                  </span>
                </div>

                {index < sortedEtapas.length - 1 && (
                  <div className="w-1 h-8 md:w-8 lg:w-12 xl:w-16 md:h-1 bg-gray-200 dark:bg-gray-700 relative my-1 md:my-0 md:mx-1 shrink-0">
                    <div
                      className="md:hidden absolute top-0 left-0 w-full bg-green-500 transition-all duration-1000 ease-out"
                      style={{ height: fillPercentage }}
                    />
                    <div
                      className="hidden md:block absolute top-0 left-0 h-full bg-green-500 transition-all duration-1000 ease-out"
                      style={{ width: fillPercentage }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {nextStep && (
          <div className="w-full lg:w-80 shrink-0 self-stretch">
            <Card className="bg-white dark:bg-slate-900 shadow-sm border-l-4 border-l-green-500 p-6 flex flex-col justify-between h-full">
              <div>
                <div className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Próximo Passo
                </div>
                <h4 className="font-bold text-lg mb-1 text-gray-800 dark:text-gray-100 line-clamp-1">
                  {nextStep.titulo}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-6">
                  {nextStep.descricao}
                </p>
              </div>
              <Button
                onClick={() => handleStepClick(nextStep.id)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white transition-all duration-200"
              >
                {readOnly
                  ? 'Ver Etapa'
                  : nextStep.status === 'em_progresso'
                    ? 'Continuar'
                    : 'Começar'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
