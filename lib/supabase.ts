import { createBrowserClient } from '@supabase/ssr';

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      // Recovery emails are commonly opened from a mobile email app or a
      // different browser. Implicit links do not depend on a PKCE verifier
      // stored in the browser that requested the reset.
      flowType: 'implicit',
    },
  },
);
