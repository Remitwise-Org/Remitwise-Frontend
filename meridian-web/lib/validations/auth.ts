import { z } from 'zod'

export const SignInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters'),
})

export type SignInDto = z.infer<typeof SignInSchema>

export const RegisterSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
})
  .refine(data => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type RegisterDto = z.infer<typeof RegisterSchema>

export const PatchUserSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(64, 'Display name must be 64 characters or fewer')
    .optional(),
  bio: z.string().max(256, 'Bio must be 256 characters or fewer').optional(),
})

export type PatchUserDto = z.infer<typeof PatchUserSchema>
