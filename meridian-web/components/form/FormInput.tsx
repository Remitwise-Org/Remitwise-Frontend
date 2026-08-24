'use client'

import { type FieldPath, type FieldValues, useFormContext } from 'react-hook-form'
import { cva, type VariantProps } from 'class-variance-authority'

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const formInputVariants = cva('', {
  variants: {
    variant: {
      default: '',
      destructive: 'text-destructive',
      warning: 'text-yellow-600 dark:text-yellow-400',
      info: 'text-blue-600 dark:text-blue-400',
    },
  },
  defaultVariants: { variant: 'default' },
})

interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> extends VariantProps<typeof formInputVariants>,
    Omit<React.ComponentProps<'input'>, 'name'> {
  name: TName
  label: string
  description?: string
  labelClassName?: string
}

export function FormInput<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  name,
  label,
  description,
  variant,
  labelClassName,
  className,
  ...inputProps
}: FormInputProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>()

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={cn(formInputVariants({ variant }), labelClassName)}>
            {label}
          </FormLabel>
          <FormControl>
            <Input {...field} {...inputProps} className={className} />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  )
}
