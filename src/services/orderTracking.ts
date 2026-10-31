export interface TrackedOrder {
  firestoreOrderId: string;
  orderId?: string | null;
  status?: string | null;
  type?: string | null;
  orderType?: string | null;
  deliveryType?: string | null;
  deliveryMode?: string | null;
  groupSize?: number;
  cafeteria?: string | null;
  cafeteriaId?: string | null;
  sectionId?: string | null;
  hostelName?: string | null;
  pickupPoint?: string | null;
  collectionInstruction?: string | null;
  plateCount?: number | null;
  foodBatchName?: string | null;
  orderWindowStart?: string | null;
  orderWindowEnd?: string | null;
  deliveryWindowStart?: string | null;
  deliveryWindowEnd?: string | null;
  assignedRiderId?: string | null;
  rider?: { name: string; phone: string } | null;
}

export async function fetchTrackedOrder(orderId: string, trackingToken: string): Promise<TrackedOrder | null> {
  if (!orderId || !trackingToken) return null;
  const response = await fetch('/api/utils/track-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, trackingToken }),
  });
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error('Could not load order tracking');
  }
  const payload = await response.json();
  return payload?.data || null;
}

export function subscribeToTrackedOrder(
  orderId: string,
  trackingToken: string,
  callback: (order: TrackedOrder | null) => void
) {
  let cancelled = false;

  const tick = async () => {
    try {
      const data = await fetchTrackedOrder(orderId, trackingToken);
      if (!cancelled) callback(data);
    } catch {
      if (!cancelled) callback(null);
    }
  };

  tick();
  const timer = setInterval(tick, 8000);
  return () => {
    cancelled = true;
    clearInterval(timer);
  };
}
