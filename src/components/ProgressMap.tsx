import { useMemo } from 'react'
import { Etapa } from '@/services/etapas'
import { Plano } from '@/services/planos'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Flame, Play, ArrowRight, Circle, Loader2, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  plano: Plano | null
  etapas: Etapa[]
}

export function ProgressMap({ plano, etapas }: Props) {
  const { progress, nextStep, streakDays } = useMemo(() => {
    if (!etapas || etapas.length === 0) return { progress: 0, nextStep: null, streakDays: 0 }

    const completed = etapas.filter((e) => e.status === 'concluido').length
    const progress = Math.round((completed / etapas.length) * 100)

    const sorted = [...etapas].sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
    const nextStep = sorted.find((e) => e.status !== 'concluido')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayMs = today.getTime()

    const activeDates = etapas
      .filter((e) => e.updated !== e.created || e.status !== 'a_fazer')
      .map((e) => {
        const d = new Date(e.updated)
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
    } else if (uniqueActive.length > 0) {
      streak = 1
    }

    return { progress, nextStep, streakDays: streak }
  }, [etapas])

  if (!plano || etapas.length === 0) {
    return (
      <Card className="p-12 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-900/20 border-dashed border-2 border-slate-200 dark:border-slate-800">
        <Target className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
        <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-slate-100">
          Mapa de Progresso
        </h3>
        <p className="text-slate-500 dark:text-slate-400">
          Gere um plano para ver seu mapa de progresso e acompanhar sua jornada.
        </p>
      </Card>
    )
  }

  const scrollToCard = (id: string) => {
    const el = document.getElementById(`kanban-card-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add(
        'ring-4',
        'ring-indigo-500',
        'ring-offset-2',
        'transition-all',
        'duration-500',
      )
      setTimeout(() => {
        el.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2')
      }, 2000)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <Card className="flex-1 p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20 pointer-events-none">
            <Target className="w-48 h-48" />
          </div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-2xl font-bold mb-1">Seu Progresso</h3>
                <p className="text-indigo-100 font-medium">
                  {etapas.filter((e) => e.status === 'concluido').length} de {etapas.length} etapas
                  concluídas
                </p>
              </div>
              <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full font-bold shadow-sm backdrop-blur-sm">
                <Flame
                  className={cn('w-5 h-5', streakDays > 0 ? 'text-orange-400' : 'text-slate-300')}
                />
                <span>
                  {streakDays} {streakDays === 1 ? 'dia' : 'dias'} seguidos!
                </span>
              </div>
            </div>
            <div>
              <div className="w-full bg-black/20 rounded-full h-3 mb-2 overflow-hidden backdrop-blur-sm">
                <div
                  className="bg-white h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-right text-sm font-bold">{progress}%</p>
            </div>
          </div>
        </Card>

        {nextStep && (
          <Card className="md:w-[400px] p-6 shadow-md border-indigo-100 dark:border-indigo-900/50 bg-white dark:bg-slate-900 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2">
                Próximo Passo
              </div>
              <h4 className="font-bold text-lg mb-1 line-clamp-1 dark:text-white">
                {nextStep.titulo}
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm line-clamp-2 mb-6">
                {nextStep.descricao}
              </p>
            </div>
            <Button
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm relative z-10"
              onClick={() => scrollToCard(nextStep.id)}
            >
              {nextStep.status === 'em_progresso' ? (
                <>
                  Continuar <ArrowRight className="w-4 h-4 ml-2" />
                </>
              ) : (
                <>
                  Começar <Play className="w-4 h-4 ml-2 fill-current" />
                </>
              )}
            </Button>
          </Card>
        )}
      </div>

      <Card className="p-6 md:p-8 overflow-x-auto bg-slate-50/50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 shadow-sm hide-scrollbar">
        <div className="flex flex-col md:flex-row items-center md:items-start justify-start md:justify-center gap-4 md:gap-0 min-w-max py-4 px-2">
          {etapas
            .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
            .map((etapa, index) => {
              const isCompleted = etapa.status === 'concluido'
              const isInProgress = etapa.status === 'em_progresso'
              const isNext = nextStep?.id === etapa.id

              return (
                <div
                  key={etapa.id}
                  className="flex flex-col md:flex-row items-center relative group"
                >
                  <button
                    onClick={() => scrollToCard(etapa.id)}
                    className="relative z-10 flex flex-col items-center gap-3 transition-transform duration-200 hover:scale-110 focus:outline-none"
                  >
                    <div
                      className={cn(
                        'w-14 h-14 rounded-full flex items-center justify-center border-[3px] shadow-sm relative transition-colors duration-300',
                        isCompleted
                          ? 'bg-emerald-500 border-emerald-600 text-white'
                          : isInProgress
                            ? 'bg-amber-400 border-amber-500 text-white ring-4 ring-amber-100 dark:ring-amber-900/50'
                            : isNext
                              ? 'bg-indigo-100 border-indigo-400 text-indigo-600 dark:bg-indigo-900/50 dark:border-indigo-500 dark:text-indigo-300 ring-4 ring-indigo-50 dark:ring-indigo-900/30'
                              : 'bg-white border-slate-200 text-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-600',
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-6 h-6 stroke-[3]" />
                      ) : isInProgress ? (
                        <Loader2 className="w-6 h-6 animate-spin stroke-[3]" />
                      ) : isNext ? (
                        <Play className="w-6 h-6 ml-0.5 fill-current" />
                      ) : (
                        <Circle className="w-5 h-5 fill-current" />
                      )}

                      {isInProgress && (
                        <div className="absolute -inset-2 rounded-full border-2 border-amber-400 animate-ping opacity-20" />
                      )}
                    </div>

                    <div className="hidden md:block absolute top-16 w-32 text-center">
                      <p
                        className={cn(
                          'text-xs font-bold truncate px-1',
                          isCompleted
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : isInProgress || isNext
                              ? 'text-slate-900 dark:text-slate-100'
                              : 'text-slate-400 dark:text-slate-500',
                        )}
                        title={etapa.titulo}
                      >
                        {etapa.titulo}
                      </p>
                    </div>
                  </button>

                  {index < etapas.length - 1 && (
                    <>
                      <div className="hidden md:block w-12 lg:w-20 h-2 -mx-1 z-0 relative">
                        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 rounded-full" />
                        {isCompleted && (
                          <div className="absolute inset-0 bg-emerald-500 rounded-full w-full transition-all duration-1000 ease-out" />
                        )}
                        {!isCompleted && etapa.status === 'em_progresso' && (
                          <div className="absolute inset-0 bg-emerald-500 rounded-full w-1/2 transition-all duration-1000 ease-out" />
                        )}
                      </div>

                      <div className="md:hidden h-8 w-2 my-1 z-0 relative">
                        <div className="absolute inset-0 bg-slate-200 dark:bg-slate-800 rounded-full" />
                        {isCompleted && (
                          <div className="absolute inset-0 bg-emerald-500 rounded-full h-full transition-all duration-1000 ease-out" />
                        )}
                        {!isCompleted && etapa.status === 'em_progresso' && (
                          <div className="absolute inset-0 bg-emerald-500 rounded-full h-1/2 transition-all duration-1000 ease-out" />
                        )}
                      </div>
                    </>
                  )}

                  <div className="md:hidden text-center mt-2 mb-4 max-w-[200px]">
                    <p
                      className={cn(
                        'text-xs font-bold truncate px-1',
                        isCompleted
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : isInProgress || isNext
                            ? 'text-slate-900 dark:text-slate-100'
                            : 'text-slate-400 dark:text-slate-500',
                      )}
                      title={etapa.titulo}
                    >
                      {etapa.titulo}
                    </p>
                  </div>
                </div>
              )
            })}
        </div>
      </Card>
    </div>
  )
}
