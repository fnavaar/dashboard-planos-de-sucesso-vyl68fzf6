import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useNewClient } from '@/contexts/NewClientContext'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { DatePicker } from '@/components/ui/date-picker'
import { createCliente } from '@/services/clients'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  objetivo_principal: z.string().min(1, 'Objetivo é obrigatório'),
  contexto: z.string().min(1, 'Contexto é obrigatório'),
  data_inicio: z.date({
    required_error: 'Data de início é obrigatória',
  }),
})

export function NewClientModal() {
  const { isOpen, setIsOpen } = useNewClient()
  const { user } = useAuth()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      objetivo_principal: '',
      contexto: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      await createCliente({
        nome: values.nome,
        objetivo_principal: values.objetivo_principal,
        contexto: values.contexto,
        data_inicio: values.data_inicio.toISOString(),
        status: 'ativo',
        progresso: 0,
        user_id: user?.id,
      })
      toast({ title: 'Cliente criado com sucesso!' })
      form.reset()
      setIsOpen(false)
    } catch (err) {
      toast({ title: 'Erro ao criar cliente', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl border-0 shadow-2xl animate-in slide-in-from-bottom-12 duration-300">
        <DialogHeader>
          <DialogTitle className="text-2xl font-extrabold text-slate-900 dark:text-white">
            Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Adicione um novo cliente Elite para acompanhar seu plano de sucesso.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome do cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="objetivo_principal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo Principal</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Faturar 100k/mês" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="contexto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contexto</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhes adicionais..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="data_inicio"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data de Início</FormLabel>
                  <DatePicker date={field.value} setDate={field.onChange} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="rounded-xl font-bold hover:bg-slate-100"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 rounded-xl font-bold transition-all duration-200"
              >
                Salvar Cliente
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
