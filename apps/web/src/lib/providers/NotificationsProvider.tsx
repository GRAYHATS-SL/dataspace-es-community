'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useProductOrdersAsBuyer, useProductOrdersAsSeller } from '@/hooks/queries';
import type { ProductOrder, ProductOrderState } from '@/types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OrderNotification {
  id: string;
  type: 'new_sale' | 'state_change';
  orderId: string;
  offeringName?: string;
  newState?: ProductOrderState;
  timestamp: number;
}

interface NotificationsContextValue {
  notifications: OrderNotification[];
  unreadCount: number;
  clearAll: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const NotificationsContext = createContext<NotificationsContextValue>({
  clearAll: () => {},
  notifications: [],
  unreadCount: 0,
});

export const useNotifications = (): NotificationsContextValue => useContext(NotificationsContext);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildSellerNotifications = (
  orders: ProductOrder[],
  prevIds: Set<string>,
): OrderNotification[] =>
  orders
    .filter((o) => !!o.id && !prevIds.has(o.id))
    .map((o) => ({
      id: `sale-${o.id}`,
      offeringName: o.productOrderItem?.[0]?.productOffering?.name,
      orderId: o.id!,
      timestamp: Date.now(),
      type: 'new_sale' as const,
    }));

const buildBuyerNotifications = (
  orders: ProductOrder[],
  prevStates: Map<string, ProductOrderState>,
): OrderNotification[] => {
  const result: OrderNotification[] = [];
  orders.forEach((o) => {
    if (!o.id || !o.state) return;
    const prev = prevStates.get(o.id);
    if (prev !== undefined && prev !== o.state) {
      result.push({
        id: `state-${o.id}-${o.state}`,
        newState: o.state,
        offeringName: o.productOrderItem?.[0]?.productOffering?.name,
        orderId: o.id,
        timestamp: Date.now(),
        type: 'state_change',
      });
    }
  });
  return result;
};

// ─── Provider ─────────────────────────────────────────────────────────────────

const POLL_INTERVAL = 30_000;

const NotificationsProvider = ({ children }: Readonly<{ children: React.ReactNode }>) => {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);

  const initializedRef = useRef(false);
  const prevSellerIdsRef = useRef<Set<string>>(new Set());
  const prevBuyerStatesRef = useRef<Map<string, ProductOrderState>>(new Map());

  const { data: sellerOrders } = useProductOrdersAsSeller({
    refetchInterval: POLL_INTERVAL,
    retry: false,
  });

  const { data: buyerOrders } = useProductOrdersAsBuyer({
    refetchInterval: POLL_INTERVAL,
    retry: false,
  });

  useEffect(() => {
    const seller = sellerOrders;
    const buyer = buyerOrders;

    if (!seller && !buyer) return;

    if (!initializedRef.current) {
      if (seller) {
        prevSellerIdsRef.current = new Set(
          seller.map((o) => o.id).filter((id): id is string => !!id),
        );
      }
      if (buyer) {
        buyer.forEach((o) => {
          if (o.id && o.state) prevBuyerStatesRef.current.set(o.id, o.state);
        });
      }
      initializedRef.current = true;
      return;
    }

    const incoming: OrderNotification[] = [];

    if (seller) {
      incoming.push(...buildSellerNotifications(seller, prevSellerIdsRef.current));
      prevSellerIdsRef.current = new Set(
        seller.map((o) => o.id).filter((id): id is string => !!id),
      );
    }

    if (buyer) {
      incoming.push(...buildBuyerNotifications(buyer, prevBuyerStatesRef.current));
      buyer.forEach((o) => {
        if (o.id && o.state) prevBuyerStatesRef.current.set(o.id, o.state);
      });
    }

    if (incoming.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNotifications((prev) => [...prev, ...incoming]);
    }
  }, [sellerOrders, buyerOrders]);

  const clearAll = useCallback(() => setNotifications([]), []);

  const contextValue = useMemo(
    () => ({ clearAll, notifications, unreadCount: notifications.length }),
    [clearAll, notifications],
  );

  return (
    <NotificationsContext.Provider value={contextValue}>{children}</NotificationsContext.Provider>
  );
};

export default NotificationsProvider;
