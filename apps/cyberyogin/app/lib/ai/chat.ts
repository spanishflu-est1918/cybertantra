// AI SDK Gateway model strings - no provider initialization needed
export const KIMI_FREE_MODEL = 'moonshotai/kimi-k2:free';
export const KIMI_REGULAR_MODEL = 'moonshotai/kimi-k2';
export const AI_MODEL = process.env.NODE_ENV === 'production' ? KIMI_FREE_MODEL : KIMI_REGULAR_MODEL;