'use server';

import { createClient } from '@/lib/supabase/server';
import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@/lib/validators/auth';
import type { ActionResult } from '@/types/api';
import { redirect } from 'next/navigation';

export async function signUpWithEmailAction(input: RegisterInput): Promise<ActionResult<{ userId: string }>> {
  const result = registerSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid registration input',
        details: result.error.flatten().fieldErrors,
      },
    };
  }

  const { email, password, fullName } = result.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return {
      success: false,
      error: {
        code: 'CONFLICT',
        message: error.message,
      },
    };
  }

  if (!data.user) {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'User could not be created. Please try again.',
      },
    };
  }

  return {
    success: true,
    data: { userId: data.user.id },
    message: 'Account created successfully! Check your email if verification is required.',
  };
}

export async function signInWithEmailAction(input: LoginInput): Promise<ActionResult<{ userId: string }>> {
  const result = loginSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid login credentials format',
        details: result.error.flatten().fieldErrors,
      },
    };
  }

  const { email, password } = result.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: error.message || 'Invalid email or password.',
      },
    };
  }

  if (!data.user) {
    return {
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication failed.',
      },
    };
  }

  return {
    success: true,
    data: { userId: data.user.id },
    message: 'Signed in successfully.',
  };
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
