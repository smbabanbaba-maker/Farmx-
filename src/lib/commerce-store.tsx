import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNotifications } from "./notifications-store";

/* ---------------- Types ---------------- */

export type KycStatus = "none" | "pending" | "approved" | "rejected";

export interface KycRecord {
  status: KycStatus;
  fullName: string;
  idType: string;
  idNumber: string;
  email: string;
  phone: string;
  businessName: string;
  address: string;
  documentKey: string; // S3 key / file name
  submittedAt: number | null;
  reviewedAt: number | null;
  reviewNote: string;
}

export type OrderStatus =
  | "awaiting_payment"
  | "funds_held"
  | "shipped"
  | "delivered"
  | "released"
  | "disputed"
  | "refunded"
  | "cancelled";

export type PayMethod = "escrow" | "pod";

export interface TimelineEntry {
  at: number;
  label: string;
}

export interface Order {
  id: string;
  productId: string;
  title: string;
  seller: string;
  sellerVerified: boolean;
  amount: number;
  method: PayMethod;
  status: OrderStatus;
  createdAt: number;
  autoReleaseAt: number | null;
  timeline: TimelineEntry[];
}

export type DisputeStatus = "open" | "under_review" | "refund_approved" | "refunded" | "rejected";

export interface Dispute {
  id: string;
  orderId: string;
  reason: string;
  details: string;
  evidence: string[];
  status: DisputeStatus;
  createdAt: number;
  updates: TimelineEntry[];
}

export interface PromoRecord {
  id: string;
  productTitle: string;
  plan: "7" | "30";
  startedAt: number;
  expiresAt: number;
  remindedAt: number | null;
}

interface State {
  kyc: KycRecord;
  orders: Order[];
  disputes: Dispute[];
  promos: PromoRecord[];
}

export const DISPUTE_REASONS = [
  "Item does not match description",
  "Wrong item delivered",
  "Item damaged or spoiled",
  "Quantity / weight short",
  "Never delivered",
];

export const ESCROW_AUTO_RELEASE_DAYS = 7;

const emptyKyc: KycRecord = {
  status: "none",
  fullName: "",
  idType: "NIN",
  idNumber: "",
  email: "",
  phone: "",
  businessName: "",
  address: "",
  documentKey: "",
  submittedAt: null,
  reviewedAt: null,
  reviewNote: "",
};

const initial: State = { kyc: emptyKyc, orders: [], disputes: [], promos: [] };

const money = (n: number) => `₦${n.toLocaleString()}`;

type Ctx = {
  kyc: KycRecord;
  orders: Order[];
  disputes: Dispute[];
  promos: PromoRecord[];
  isVerifiedSeller: boolean;
  submitKyc: (d: Partial<KycRecord>) => void;
  reviewKyc: (approve: boolean, note?: string) => void;
  resetKyc: () => void;
  createOrder: (o: {
    productId: string;
    title: string;
    seller: string;
    sellerVerified: boolean;
    amount: number;
    method: PayMethod;
  }) => Order | null;
  fundEscrow: (orderId: string, reference: string) => void;
  markShipped: (orderId: string) => void;
  confirmReceived: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  openDispute: (
    orderId: string,
    reason: string,
    details: string,
    evidence: string[],
  ) => Dispute | null;
  addEvidence: (disputeId: string, item: string) => void;
  advanceDispute: (disputeId: string, status: DisputeStatus, note?: string) => void;
  addPromo: (productTitle: string, plan: "7" | "30") => void;
  disputeForOrder: (orderId: string) => Dispute | undefined;
};

const C = createContext<Ctx | null>(null);

export function CommerceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initial);
  const { notify } = useNotifications();
  const ref = useRef(state);
  ref.current = state;

  const persist = useCallback((next: State) => {
    ref.current = next;
    setState(next);
  }, []);

  /* --- background timers: escrow auto-release + promo expiry reminders --- */
  useEffect(() => {
    const tick = () => {
      const s = ref.current;
      const now = Date.now();
      let changed = false;
      const orders = s.orders.map((o) => {
        if (
          o.method === "escrow" &&
          o.status === "delivered" &&
          o.autoReleaseAt &&
          now >= o.autoReleaseAt
        ) {
          changed = true;
          notify({
            type: "escrow",
            title: "Escrow released",
            body: `${money(o.amount)} released to ${o.seller} for "${o.title}".`,
            link: "/orders",
          });
          return {
            ...o,
            status: "released" as OrderStatus,
            timeline: [...o.timeline, { at: now, label: "Funds auto-released to seller" }],
          };
        }
        return o;
      });
      const promos = s.promos.map((p) => {
        const dayLeft = p.expiresAt - now;
        if (!p.remindedAt && dayLeft <= 24 * 3600 * 1000) {
          changed = true;
          notify({
            type: "promo",
            title: dayLeft <= 0 ? "TOP promo expired" : "TOP promo expiring soon",
            body:
              dayLeft <= 0
                ? `Promo for "${p.productTitle}" has ended.`
                : `Promo for "${p.productTitle}" ends in less than 24 hours.`,
            link: "/orders",
          });
          return { ...p, remindedAt: now };
        }
        return p;
      });
      if (changed) persist({ ...s, orders, promos });
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [notify, persist]);

  const value = useMemo<Ctx>(() => {
    const s = state;
    const isVerifiedSeller = s.kyc.status === "approved";
    const push = (o: Order, label: string, status: OrderStatus, extra?: Partial<Order>): Order => ({
      ...o,
      status,
      ...extra,
      timeline: [...o.timeline, { at: Date.now(), label }],
    });
    const updateOrder = (id: string, fn: (o: Order) => Order) =>
      persist({ ...ref.current, orders: ref.current.orders.map((o) => (o.id === id ? fn(o) : o)) });

    return {
      kyc: s.kyc,
      orders: s.orders,
      disputes: s.disputes,
      promos: s.promos,
      isVerifiedSeller,
      disputeForOrder: (orderId) => s.disputes.find((d) => d.orderId === orderId),

      submitKyc: (d) => {
        const kyc: KycRecord = {
          ...ref.current.kyc,
          ...d,
          status: "pending",
          submittedAt: Date.now(),
          reviewedAt: null,
          reviewNote: "",
        };
        persist({ ...ref.current, kyc });
        notify({
          type: "kyc",
          title: "Verification submitted",
          body: "Your seller KYC is now awaiting admin review.",
          link: "/verify",
        });
      },
      reviewKyc: (approve, note = "") => {
        const kyc: KycRecord = {
          ...ref.current.kyc,
          status: approve ? "approved" : "rejected",
          reviewedAt: Date.now(),
          reviewNote: note,
        };
        persist({ ...ref.current, kyc });
        notify({
          type: "kyc",
          title: approve ? "Seller verified" : "Verification rejected",
          body: approve
            ? "You can now receive orders and escrow payments."
            : note || "Please re-submit with clearer documents.",
          link: "/verify",
        });
      },
      resetKyc: () => persist({ ...ref.current, kyc: emptyKyc }),

      createOrder: (o) => {
        if (o.method === "escrow" && !o.sellerVerified) return null;
        const order: Order = {
          ...o,
          id: `o_${Date.now()}`,
          status: o.method === "escrow" ? "awaiting_payment" : "funds_held",
          createdAt: Date.now(),
          autoReleaseAt: null,
          timeline: [
            {
              at: Date.now(),
              label:
                o.method === "escrow"
                  ? "Order created — escrow payment pending"
                  : "Order created — pay on delivery",
            },
          ],
        };
        if (o.method === "pod") order.status = "shipped";
        persist({ ...ref.current, orders: [order, ...ref.current.orders] });
        notify({
          type: "order",
          title: "Order created",
          body: `${o.title} · ${money(o.amount)}`,
          link: "/orders",
        });
        return order;
      },
      fundEscrow: (orderId, reference) => {
        updateOrder(orderId, (o) => push(o, `Escrow funded (${reference})`, "funds_held"));
        const o = ref.current.orders.find((x) => x.id === orderId);
        notify({
          type: "escrow",
          title: "Funds held in escrow",
          body: o ? `${money(o.amount)} is safely held until you confirm delivery.` : "Funds held.",
          link: "/orders",
        });
      },
      markShipped: (orderId) => {
        updateOrder(orderId, (o) => push(o, "Seller shipped the item", "shipped"));
        notify({
          type: "order",
          title: "Order shipped",
          body: "The seller marked your order as shipped.",
          link: "/orders",
        });
      },
      confirmReceived: (orderId) => {
        updateOrder(orderId, (o) =>
          push(o, "Buyer confirmed delivery — funds released", "released"),
        );
        const o = ref.current.orders.find((x) => x.id === orderId);
        notify({
          type: "escrow",
          title: "Escrow released",
          body: o ? `${money(o.amount)} released to ${o.seller}.` : "Funds released.",
          link: "/orders",
        });
      },
      cancelOrder: (orderId) => {
        updateOrder(orderId, (o) => push(o, "Order cancelled", "cancelled"));
        notify({
          type: "order",
          title: "Order cancelled",
          body: "The order was cancelled.",
          link: "/orders",
        });
      },

      openDispute: (orderId, reason, details, evidence) => {
        const order = ref.current.orders.find((o) => o.id === orderId);
        if (!order) return null;
        const dispute: Dispute = {
          id: `d_${Date.now()}`,
          orderId,
          reason,
          details,
          evidence,
          status: "open",
          createdAt: Date.now(),
          updates: [{ at: Date.now(), label: "Claim filed by buyer" }],
        };
        persist({
          ...ref.current,
          disputes: [dispute, ...ref.current.disputes],
          orders: ref.current.orders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: "disputed" as OrderStatus,
                  autoReleaseAt: null,
                  timeline: [...o.timeline, { at: Date.now(), label: `Dispute opened: ${reason}` }],
                }
              : o,
          ),
        });
        notify({
          type: "dispute",
          title: "Claim filed",
          body: `${reason} — escrow is frozen while we review.`,
          link: "/disputes",
        });
        return dispute;
      },
      addEvidence: (disputeId, item) =>
        persist({
          ...ref.current,
          disputes: ref.current.disputes.map((d) =>
            d.id === disputeId
              ? {
                  ...d,
                  evidence: [...d.evidence, item],
                  updates: [...d.updates, { at: Date.now(), label: `Evidence added: ${item}` }],
                }
              : d,
          ),
        }),
      advanceDispute: (disputeId, status, note = "") => {
        const d = ref.current.disputes.find((x) => x.id === disputeId);
        if (!d) return;
        const labels: Record<DisputeStatus, string> = {
          open: "Claim re-opened",
          under_review: "Support team reviewing evidence",
          refund_approved: "Refund approved",
          refunded: "Refund paid back to buyer wallet",
          rejected: "Claim rejected",
        };
        const disputes = ref.current.disputes.map((x) =>
          x.id === disputeId
            ? {
                ...x,
                status,
                updates: [...x.updates, { at: Date.now(), label: note || labels[status] }],
              }
            : x,
        );
        const orders = ref.current.orders.map((o) => {
          if (o.id !== d.orderId) return o;
          if (status === "refunded")
            return {
              ...o,
              status: "refunded" as OrderStatus,
              timeline: [...o.timeline, { at: Date.now(), label: "Refund completed" }],
            };
          if (status === "rejected")
            return {
              ...o,
              status: "released" as OrderStatus,
              timeline: [
                ...o.timeline,
                { at: Date.now(), label: "Claim rejected — funds released to seller" },
              ],
            };
          return o;
        });
        persist({ ...ref.current, disputes, orders });
        notify({
          type: "dispute",
          title: labels[status],
          body: note || `Claim on order ${d.orderId.slice(-5)} updated.`,
          link: "/disputes",
        });
      },

      addPromo: (productTitle, plan) => {
        const days = plan === "7" ? 7 : 30;
        const promo: PromoRecord = {
          id: `p_${Date.now()}`,
          productTitle,
          plan,
          startedAt: Date.now(),
          expiresAt: Date.now() + days * 24 * 3600 * 1000,
          remindedAt: null,
        };
        persist({ ...ref.current, promos: [promo, ...ref.current.promos] });
        notify({
          type: "promo",
          title: "TOP promo active",
          body: `"${productTitle}" is promoted for ${days} days.`,
          link: "/orders",
        });
      },
    };
  }, [state, persist, notify]);

  return <C.Provider value={value}>{children}</C.Provider>;
}

export function useCommerce() {
  const ctx = useContext(C);
  if (!ctx) throw new Error("useCommerce must be used inside CommerceProvider");
  return ctx;
}

export const ORDER_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting escrow payment",
  funds_held: "Funds held in escrow",
  shipped: "Shipped",
  delivered: "Delivered — confirm receipt",
  released: "Completed · funds released",
  disputed: "Dispute in progress",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export const DISPUTE_LABEL: Record<DisputeStatus, string> = {
  open: "Open",
  under_review: "Under review",
  refund_approved: "Refund approved",
  refunded: "Refunded",
  rejected: "Rejected",
};
