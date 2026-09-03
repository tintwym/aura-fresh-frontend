import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { confirmCheckoutSession, fetchOrderHistory, fetchProducts } from '../lib/shopApi';
import { mapApiOrderToUiOrder, mapProductToGrocery } from '../lib/mapProduct';
import { getStoredToken } from '../lib/authApi';
import { AuthApiError } from '../lib/authValidation';
import type { GroceryItem, Order } from '../types';

type Props = {
  onOrdersLoaded: (orders: Order[]) => void;
  onGroceriesLoaded: (items: GroceryItem[]) => void;
  onClearCart: () => void;
  onAddToast: (title: string, msg: string, type: 'success' | 'warning' | 'info') => void;
};

export default function PaymentSuccessPage({
  onOrdersLoaded,
  onGroceriesLoaded,
  onClearCart,
  onAddToast,
}: Props) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get('session_id') || '';
  const [status, setStatus] = useState<'loading' | 'ok'>('loading');
  const [message, setMessage] = useState('Confirming your payment…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!sessionId) {
        navigate('/payment/failed?reason=' + encodeURIComponent('Missing Stripe session.'), {
          replace: true,
        });
        return;
      }
      if (!getStoredToken()) {
        navigate(
          '/error/session?reason=' +
            encodeURIComponent('Sign in to confirm your payment, then check Orders.'),
          { replace: true },
        );
        return;
      }

      try {
        await confirmCheckoutSession(sessionId);
        const [apiOrders, apiProducts] = await Promise.all([
          fetchOrderHistory(),
          fetchProducts(),
        ]);
        if (cancelled) return;
        const groceries = apiProducts.map(mapProductToGrocery);
        onGroceriesLoaded(groceries);
        onOrdersLoaded(apiOrders.map((o) => mapApiOrderToUiOrder(o, groceries)));
        onClearCart();
        setStatus('ok');
        setMessage('Payment confirmed. Your order is being prepared.');
        onAddToast('Payment successful', 'Thank you — your Aura Fresh order is confirmed.', 'success');
      } catch (err) {
        if (cancelled) return;
        if (err instanceof AuthApiError && err.status === 401) {
          navigate('/error/session', { replace: true });
          return;
        }
        if (err instanceof AuthApiError && err.status >= 500) {
          navigate(
            '/500?reason=' + encodeURIComponent(err.message || 'Server error'),
            { replace: true },
          );
          return;
        }
        const errMsg = err instanceof Error ? err.message : 'Could not confirm payment.';
        onAddToast('Payment confirm failed', errMsg, 'warning');
        navigate('/payment/failed?reason=' + encodeURIComponent(errMsg), { replace: true });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-[#eef4ef] dark:bg-[#0c1410] text-[#1a2e24] dark:text-[#e7efe9] grid place-items-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-[#2d6a4f]/15 dark:border-white/10 bg-white/90 dark:bg-[#121a16] p-8 text-center shadow-market">
        {status === 'loading' && (
          <Loader2 className="w-10 h-10 mx-auto text-[#40916c] animate-spin" />
        )}
        {status === 'ok' && <CheckCircle2 className="w-10 h-10 mx-auto text-[#2d6a4f]" />}
        <h1 className="mt-4 font-display text-xl font-semibold">
          {status === 'loading' ? 'Confirming…' : 'Order confirmed'}
        </h1>
        <p className="mt-2 text-sm text-[#5c6f66] dark:text-[#8a9e94]">{message}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-2xl bg-[#2d6a4f] text-white font-semibold py-2.5 cursor-pointer hover:bg-[#40916c]"
          >
            Back to shop
          </button>
          <Link to="/" className="text-sm text-[#5c6f66] hover:text-[#2d6a4f]">
            Continue browsing
          </Link>
        </div>
      </div>
    </div>
  );
}
