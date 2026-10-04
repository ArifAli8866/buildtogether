export type ActionSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

export type ActionError = {
  success: false;
  error: {
    code:
      | 'UNAUTHORIZED'
      | 'FORBIDDEN'
      | 'NOT_FOUND'
      | 'VALIDATION_ERROR'
      | 'CONFLICT'
      | 'INTERNAL_ERROR';
    message: string;
    details?: Record<string, string[] | undefined>;
  };
};

export type ActionResult<T> = ActionSuccess<T> | ActionError;
