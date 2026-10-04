'use server';

import { createClient } from '@/lib/supabase/server';
import {
  searchQuerySchema,
  type SearchQueryInput,
} from '@/lib/validators/search';
import { performGlobalSearch } from '@/lib/queries/search';
import type { ActionResult } from '@/types/api';
import type { GlobalSearchResponse } from '@/types/database';

/**
 * Server action to execute global searches across projects, developers,
 * community posts, and workspace tasks.
 */
export async function globalSearchAction(
  input: SearchQueryInput
): Promise<ActionResult<GlobalSearchResponse>> {
  const parseResult = searchQuerySchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid search parameters.',
        details: parseResult.error.flatten().fieldErrors,
      },
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const result = await performGlobalSearch({
      query: parseResult.data.q,
      type: parseResult.data.type,
      currentUserId: user?.id ?? null,
      limit: parseResult.data.limit,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error('Error in globalSearchAction:', error);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred while performing search.',
      },
    };
  }
}
