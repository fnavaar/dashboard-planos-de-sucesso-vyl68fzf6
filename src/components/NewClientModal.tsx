import { useState } from 'react'
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
import { getUserByEmail, createUser } from '@/services/users'
import pb from '@/lib/pocketbase/client'
import { Loader2 } from 'lucide-react'
import { extractFieldErrors } from '@/lib/pocketbase/errors'

const formSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  objetivo_principal: z.string().optional(),
  contexto: z.string().optional(),
  data_inicio: z.date({
    required_error: 'Data de início é obrigatória',
  }),
  tldv_meeting_id: z.string().optional(),
})

export function NewClientModal() {
  const { isOpen, setIsOpen } = useNewClient()
  const { user } = useAuth()
  const { toast } = useToast()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: '',
      email: '',
      objetivo_principal: '',
      contexto: '',
      tldv_meeting_id: '',
    },
  })

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!values.tldv_meeting_id && (!values.objetivo_principal || !values.contexto)) {
      toast({
        title: 'Preencha o objetivo e contexto ou informe uma reunião do TLDV.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      let finalTldvId = values.tldv_meeting_id?.trim()

      if (finalTldvId) {
        const match = finalTldvId.match(/tldv\.io\/app\/meetings\/([a-zA-Z0-9_-]+)/)
        finalTldvId = match ? match[1] : finalTldvId
      }

      let clientUserId = user?.id

      const clientEmail = values.email.trim()
      let clientUser = await getUserByEmail(clientEmail)
      let createdNewUser = false
      if (!clientUser) {
        clientUser = await createUser({
          email: clientEmail,
          name: values.nome,
          password: 'Skip@Pass123',
          role: 'user',
        })
        createdNewUser = true
      }

      if (clientUser) {
        clientUserId = clientUser.id
      }

      try {
        await createCliente({
          nome: values.nome,
          objetivo_principal: values.objetivo_principal || '',
          contexto: values.contexto || '',
          data_inicio: values.data_inicio.toISOString(),
          status: 'ativo',
          progresso: 0,
          user_id: clientUserId,
          tldv_meeting_id: finalTldvId || '',
        })
      } catch (err) {
        // Rollback user creation to prevent ghost records
        if (createdNewUser && clientUserId) {
          try {
            await pb.collection('users').delete(clientUserId)
          } catch (e) {
            // Ignore rollback errors
          }
        }
        throw err
      }

      if (finalTldvId) {
        toast({
          title: 'Cliente criado com sucesso!',
          description: 'O plano de sucesso será gerado pela IA em instantes.',
        })
      } else {
        toast({ title: 'Cliente criado com sucesso!' })
      }

      form.reset()
      setIsOpen(false)
    } catch (err: any) {
      const fieldErrors = extractFieldErrors(err)

      if (fieldErrors && Object.keys(fieldErrors).length > 0) {
        Object.entries(fieldErrors).forEach(([field, message]) => {
          if (field === 'email' && err?.response?.data?.email?.code === 'validation_not_unique') {
            form.setError('email', { type: 'manual', message: 'Este e-mail já está em uso.' })
          } else {
            form.setError(field as any, { type: 'manual', message })
          }
        })
        return
      }

      toast({ title: 'Erro ao criar cliente', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
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
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="Email do cliente" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tldv_meeting_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link ou ID da Reunião TLDV (Kickoff)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: https://tldv.io/app/meetings/abc123 ou apenas o ID"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!form.watch('tldv_meeting_id') && (
              <>
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
              </>
            )}
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
                disabled={isSubmitting}
                className="bg-indigo-600 text-white hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 rounded-xl font-bold transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Cliente'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
