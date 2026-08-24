'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type SubmitHandler,
} from 'react-hook-form'
import type { z, ZodType } from 'zod'

import { Form } from '@/components/ui/form'

interface FormWrapperProps<TSchema extends ZodType<FieldValues>> {
  schema: TSchema
  defaultValues: DefaultValues<z.infer<TSchema>>
  onSubmit: SubmitHandler<z.infer<TSchema>>
  children: (methods: ReturnType<typeof useForm<z.infer<TSchema>>>) => React.ReactNode
  className?: string
}

export function FormWrapper<TSchema extends ZodType<FieldValues>>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
}: FormWrapperProps<TSchema>) {
  const methods = useForm<z.infer<TSchema>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onTouched',
  })

  return (
    <Form {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className={className}
        noValidate
      >
        {children(methods)}
      </form>
    </Form>
  )
}
