import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Home,
  Search,
  LogIn,
  ShieldOff,
  ServerCrash,
  WifiOff,
  Wrench,
  Clock,
  CreditCard,
  AlertTriangle,
  ShoppingCart,
  ArrowLeft,
  Ban,
  Timer,
  Gauge,
  CloudOff,
  type LucideIcon,
} from 'lucide-react';

/** Full status/error page set for the shop. */
export type StatusCode =
  | '400'
  | '401'
  | '403'
  | '404'
  | '408'
  | '429'
  | '500'
  | '502'
  | '503'
  | '504'
  | 'offline'
  | 'maintenance'
  | 'session'
  | 'payment-failed'
  | 'payment-cancelled'
  | 'unexpected';

type PrimaryAction = 'home' | 'reload' | 'cart' | 'signin';

type StatusConfig = {
  code: string;
  title: string;
  description: string;
  accent: string;
  Icon: LucideIcon;
  primary?: { label: string; to?: string; action?: PrimaryAction };
  secondary?: { label: string; to: string };
};

const STATUS: Record<StatusCode, StatusConfig> = {
  '400': {
    code: '400',
    title: 'Bad request',
    description: 'That request could not be understood. Check what you submitted and try again.',
    accent: 'text-[#c45c26]',
    Icon: Ban,
    primary: { label: 'Back to market', to: '/', action: 'home' },
  },
  '401': {
    code: '401',
    title: 'Sign in required',
    description: 'You need an Aura Fresh account to view this page. Sign in and try again.',
    accent: 'text-[#2d6a4f]',
    Icon: LogIn,
    primary: { label: 'Go home to sign in', to: '/?auth=1', action: 'signin' },
    secondary: { label: 'Back to market', to: '/' },
  },
  '403': {
    code: '403',
    title: 'Access denied',
    description:
      "You don't have permission to open this page. If you think this is a mistake, contact support.",
    accent: 'text-[#c45c26]',
    Icon: ShieldOff,
    primary: { label: 'Back to market', to: '/' },
  },
  '404': {
    code: '404',
    title: 'Page not found',
    description:
      "That link doesn't match anything in the Aura Fresh market. Check the URL or head back home.",
    accent: 'text-[#2d6a4f]',
    Icon: Search,
    primary: { label: 'Back to market', to: '/', action: 'home' },
    secondary: { label: 'Browse groceries', to: '/#catalog-section' },
  },
  '408': {
    code: '408',
    title: 'Request timeout',
    description: 'The request took too long. Check your connection and try again.',
    accent: 'text-[#8a5a2b]',
    Icon: Timer,
    primary: { label: 'Try again', action: 'reload' },
    secondary: { label: 'Back to market', to: '/' },
  },
  '429': {
    code: '429',
    title: 'Too many requests',
    description: 'Slow down for a moment — too many requests were sent. Try again shortly.',
    accent: 'text-[#c45c26]',
    Icon: Gauge,
    primary: { label: 'Try again', action: 'reload' },
    secondary: { label: 'Back to market', to: '/' },
  },
  '500': {
    code: '500',
    title: 'Server error',
    description: "Our servers hit a problem. We're on it — please try again in a moment.",
    accent: 'text-[#c45c26]',
    Icon: ServerCrash,
    primary: { label: 'Try again', action: 'reload' },
    secondary: { label: 'Back to market', to: '/' },
  },
  '502': {
    code: '502',
    title: 'Bad gateway',
    description: 'A gateway between you and Aura Fresh failed. Please retry in a moment.',
    accent: 'text-[#c45c26]',
    Icon: CloudOff,
    primary: { label: 'Try again', action: 'reload' },
    secondary: { label: 'Back to market', to: '/' },
  },
  '503': {
    code: '503',
    title: 'Service unavailable',
    description: 'Aura Fresh is temporarily unavailable. Please check back soon.',
    accent: 'text-[#2d6a4f]',
    Icon: Wrench,
    primary: { label: 'Check again', action: 'reload' },
    secondary: { label: 'Back to market', to: '/' },
  },
  '504': {
    code: '504',
    title: 'Gateway timeout',
    description: 'The upstream service timed out. Wait a bit, then try again.',
    accent: 'text-[#8a5a2b]',
    Icon: Timer,
    primary: { label: 'Try again', action: 'reload' },
    secondary: { label: 'Back to market', to: '/' },
  },
  offline: {
    code: 'Offline',
    title: "You're offline",
    description:
      'Aura Fresh needs an internet connection to load the catalog and checkout. Reconnect, then retry.',
    accent: 'text-[#8a5a2b]',
    Icon: WifiOff,
    primary: { label: 'Retry connection', action: 'reload' },
    secondary: { label: 'Back to market', to: '/' },
  },
  maintenance: {
    code: 'Soon',
    title: 'Under maintenance',
    description: "We're refreshing the market kitchen. Check back shortly — your cart will wait.",
    accent: 'text-[#2d6a4f]',
    Icon: Wrench,
    primary: { label: 'Check again', action: 'reload' },
  },
  session: {
    code: 'Session',
    title: 'Session expired',
    description: 'For your security, please sign in again to continue shopping and checkout.',
    accent: 'text-[#c45c26]',
    Icon: Clock,
    primary: { label: 'Sign in again', to: '/?auth=1', action: 'signin' },
    secondary: { label: 'Back to market', to: '/' },
  },
  'payment-failed': {
    code: 'Payment',
    title: 'Payment failed',
    description:
      "We couldn't complete or confirm your Stripe payment. Nothing was charged incorrectly — you can retry from your cart.",
    accent: 'text-[#c45c26]',
    Icon: CreditCard,
    primary: { label: 'Resume cart', action: 'cart' },
    secondary: { label: 'Back to market', to: '/' },
  },
  'payment-cancelled': {
    code: 'Cancelled',
    title: 'Payment cancelled',
    description:
      "No charge was made. Your cart is still here whenever you're ready to finish checkout with Stripe.",
    accent: 'text-[#c45c26]',
    Icon: ShoppingCart,
    primary: { label: 'Resume cart', action: 'cart' },
    secondary: { label: 'Back to market', to: '/' },
  },
  unexpected: {
    code: 'Error',
    title: 'Something went wrong',
    description: 'The app hit an unexpected problem. Try again, or return to the market.',
    accent: 'text-[#c45c26]',
    Icon: AlertTriangle,
    primary: { label: 'Try again', action: 'reload' },
    secondary: { label: 'Back to market', to: '/' },
  },
};

/** Map HTTP / API status numbers onto a status page kind. */
export function statusKindFromHttp(status: number): StatusCode {
  switch (status) {
    case 400:
      return '400';
    case 401:
      return '401';
    case 403:
      return '403';
    case 404:
      return '404';
    case 408:
      return '408';
    case 429:
      return '429';
    case 502:
      return '502';
    case 503:
      return '503';
    case 504:
      return '504';
    default:
      if (status >= 500) return '500';
      return 'unexpected';
  }
}

/** Canonical path for a status kind (short numeric when possible). */
export function pathForStatus(kind: StatusCode): string {
  const numeric = ['400', '401', '403', '404', '408', '429', '500', '502', '503', '504'] as const;
  if ((numeric as readonly string[]).includes(kind)) return `/${kind}`;
  if (kind === 'payment-failed') return '/payment/failed';
  if (kind === 'payment-cancelled') return '/payment/cancelled';
  if (kind === 'offline') return '/error/offline';
  if (kind === 'maintenance') return '/error/maintenance';
  if (kind === 'session') return '/error/session';
  return '/error';
}

type StatusPageProps = {
  kind: StatusCode;
  detail?: string;
  onOpenCart?: () => void;
  onSignIn?: () => void;
};

export default function StatusPage({ kind, detail, onOpenCart, onSignIn }: StatusPageProps) {
  const cfg = STATUS[kind];
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const detailFromQuery = params.get('reason') || params.get('message') || '';
  const detailText = detail || detailFromQuery || '';
  const Icon = cfg.Icon;

  const runPrimary = () => {
    const action = cfg.primary?.action;
    if (action === 'reload') {
      window.location.reload();
      return;
    }
    if (action === 'cart' && onOpenCart) {
      onOpenCart();
      return;
    }
    if (action === 'signin' && onSignIn) {
      onSignIn();
      return;
    }
    if (cfg.primary?.to) {
      const to = cfg.primary.to;
      const wantsAuth = to.includes('auth=1');
      navigate(wantsAuth ? '/' : to);
      if (wantsAuth && onSignIn) onSignIn();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-5 bg-[#eef4ef] dark:bg-[#0c1410] text-[#1a2e24] dark:text-[#e7efe9]">
      <div className="max-w-md w-full text-center">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 dark:bg-[#121a16] shadow-market ${cfg.accent}`}
        >
          <Icon className="w-7 h-7" aria-hidden />
        </div>
        <p className={`font-display text-5xl sm:text-6xl font-semibold tracking-tight ${cfg.accent}`}>
          {cfg.code}
        </p>
        <h1 className="mt-3 font-display text-2xl font-semibold">{cfg.title}</h1>
        <p className="mt-2 text-sm text-[#5c6f66] dark:text-[#8a9e94] leading-relaxed">
          {cfg.description}
        </p>
        {detailText ? (
          <p className="mt-3 rounded-xl border border-[#c45c26]/20 bg-white/80 dark:bg-[#121a16] px-3 py-2 text-left text-[11px] font-mono text-[#5c6f66] dark:text-[#8a9e94] break-words">
            {detailText}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {cfg.primary && (
            <button
              type="button"
              onClick={runPrimary}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#2d6a4f] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#40916c] transition-colors cursor-pointer"
            >
              {cfg.primary.action === 'cart' ? (
                <ShoppingCart className="w-4 h-4" />
              ) : cfg.primary.action === 'signin' ? (
                <LogIn className="w-4 h-4" />
              ) : cfg.primary.to === '/' || cfg.primary.action === 'home' ? (
                <Home className="w-4 h-4" />
              ) : (
                <ArrowLeft className="w-4 h-4" />
              )}
              {cfg.primary.label}
            </button>
          )}
          {cfg.secondary && (
            <Link
              to={cfg.secondary.to}
              className="inline-flex items-center gap-2 rounded-2xl border border-[#2d6a4f]/20 bg-white/80 dark:bg-[#121a16] px-5 py-2.5 text-sm font-semibold hover:bg-white dark:hover:bg-[#1a2420] transition-colors"
            >
              {cfg.secondary.label}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return <StatusPage kind="404" />;
}
export function BadRequestPage() {
  return <StatusPage kind="400" />;
}
export function UnauthorizedPage({ onSignIn }: { onSignIn?: () => void }) {
  return <StatusPage kind="401" onSignIn={onSignIn} />;
}
export function ForbiddenPage() {
  return <StatusPage kind="403" />;
}
export function TimeoutPage() {
  return <StatusPage kind="408" />;
}
export function TooManyRequestsPage() {
  return <StatusPage kind="429" />;
}
export function ServerErrorPage() {
  return <StatusPage kind="500" />;
}
export function BadGatewayPage() {
  return <StatusPage kind="502" />;
}
export function ServiceUnavailablePage() {
  return <StatusPage kind="503" />;
}
export function GatewayTimeoutPage() {
  return <StatusPage kind="504" />;
}
export function OfflinePage() {
  return <StatusPage kind="offline" />;
}
export function MaintenancePage() {
  return <StatusPage kind="maintenance" />;
}
export function SessionExpiredPage({ onSignIn }: { onSignIn?: () => void }) {
  return <StatusPage kind="session" onSignIn={onSignIn} />;
}
export function PaymentFailedPage({ onOpenCart }: { onOpenCart?: () => void }) {
  return <StatusPage kind="payment-failed" onOpenCart={onOpenCart} />;
}
export function UnexpectedErrorPage() {
  return <StatusPage kind="unexpected" />;
}
