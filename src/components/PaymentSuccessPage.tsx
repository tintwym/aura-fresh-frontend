import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { confirmCheckoutSession, fetchOrderHistory, fetchProducts } from '../lib/shopApi';
import { mapApiOrderToUiOrder, mapProductToGrocery } from '../lib/mapProduct';
import { getStoredToken } from '../lib/authApi';
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
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [message, setMessage] = useState('Confirming your payment…');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!sessionId) {
        setStatus('error');
        setMessage('Missing Stripe session. Return to the shop and try again.');
        return;
      }
      if (!getStoredToken()) {
        setStatus('error');
        setMessage('Please sign in, then open this page again or check Orders.');
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
        const errMsg = err instanceof Error ? err.message : 'Could not confirm payment.';
        setStatus('error');
        setMessage(errMsg);
        onAddToast('Payment confirm failed', errMsg, 'warning');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0F0F0F] text-slate-800 dark:text-slate-200 grid place-items-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#161616] p-8 text-center shadow-sm">
        {status === 'loading' && (
          <Loader2 className="w-10 h-10 mx-auto text-emerald-500 animate-spin" />
        )}
        {status === 'ok' && <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />}
        {status === 'error' && <XCircle className="w-10 h-10 mx-auto text-red-500" />}
        <h1 className="mt-4 font-display text-xl font-black">
          {status === 'loading' ? 'Confirming…' : status === 'ok' ? 'Order confirmed' : 'Something went wrong'}
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="rounded-xl bg-emerald-500 text-black font-bold py-2.5 cursor-pointer"
          >
            Back to shop
          </button>
          <Link to="/" className="text-sm text-slate-500 hover:text-emerald-600">
            Continue browsing
          </Link>
        </div>
      </div>
    </div>
  );
}
