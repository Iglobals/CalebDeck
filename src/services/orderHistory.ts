/**
 * LocalStorage-based order history for students.
 * Stores compact order summaries so students can view past orders on this device.
 * Max 50 orders kept. Oldest are pruned automatically.
 */

const STORAGE_KEY = 'calebdeck_order_history';
const MAX_ORDERS = 50;

export interface OrderHistoryEntry {
  id: string;                // Firestore document ID (paymentReference)
  orderId: string;           // Human-readable order ID (CD-12345, CD-MART-12345)
  type: 'food' | 'combo' | 'mart' | 'calebnet' | 'fashion';
  summary: string;           // e.g. "3 plates from Old Cafeteria" or "MTN 2GB Data"
  total: number;
  status: string;
  hostelName?: string;
  createdAt: string;         // ISO string
}

function readHistory(): OrderHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeHistory(entries: OrderHistoryEntry[]) {
  try {
    // Keep only the most recent MAX_ORDERS
    const trimmed = entries.slice(0, MAX_ORDERS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Failed to write order history:', e);
  }
}

/** Save a new order to history. De-dupes by id.
 *  On duplicate: keep the existing entry's type/summary (first save is authoritative —
 *  a later tracking visit must never flip a Fashion/Mart entry to Food) and only
 *  refresh the live fields. */
export function saveOrderToHistory(entry: OrderHistoryEntry) {
  const history = readHistory();
  const existingIdx = history.findIndex(h => h.id === entry.id);
  if (existingIdx >= 0) {
    const existing = history[existingIdx];
    history[existingIdx] = {
      ...existing,
      type: existing.type || entry.type,
      summary: existing.summary || entry.summary,
      orderId: existing.orderId || entry.orderId,
      total: entry.total || existing.total,
      status: entry.status || existing.status,
      hostelName: entry.hostelName || existing.hostelName,
      createdAt: existing.createdAt,
    };
    writeHistory(history);
    return;
  }
  // Prepend new entry
  history.unshift(entry);
  writeHistory(history);
}

/** Get all saved orders, newest first */
export function getOrderHistory(): OrderHistoryEntry[] {
  return readHistory();
}

/** Update a saved entry's status from a live source (e.g. CalebNetStatus).
 *  Cold localStorage entries otherwise stay frozen at their purchase-time status. */
export function updateOrderHistoryStatus(id: string, status: string) {
  const history = readHistory();
  const idx = history.findIndex(h => h.id === id);
  if (idx === -1 || history[idx].status === status) return;
  history[idx] = { ...history[idx], status };
  writeHistory(history);
}

/** Clear all order history */
export function clearOrderHistory() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Get count of saved orders */
export function getOrderCount(): number {
  return readHistory().length;
}

// ─── Helpers to build entries from each checkout flow ───

/** Build entry from food/combo order success state */
export function buildFoodOrderEntry(orderState: any): OrderHistoryEntry {
  const isCombo = orderState.type === 'combo' || !!orderState.comboName;
  const plateCount = orderState.plates?.length || orderState.quantity || 0;
  
  let summary: string;
  if (isCombo) {
    summary = `${orderState.comboName || 'Combo'} × ${orderState.quantity || 1}`;
  } else {
    summary = `${plateCount} plate${plateCount !== 1 ? 's' : ''} from ${orderState.cafeteria || 'Cafeteria'}`;
  }

  return {
    id: orderState.firestoreOrderId || orderState.paymentReference || orderState.orderId,
    orderId: orderState.orderId,
    type: isCombo ? 'combo' : 'food',
    summary,
    total: orderState.total || orderState.totalAmount || 0,
    status: orderState.status || 'PAID',
    hostelName: orderState.hostelName || orderState.hostel,
    createdAt: new Date().toISOString()
  };
}

/** Build entry from mart order success state */
export function buildMartOrderEntry(orderState: any): OrderHistoryEntry {
  const itemCount = orderState.items?.length || 0;
  const totalQty = orderState.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 0;
  
  return {
    id: orderState.firestoreOrderId || orderState.paymentReference || orderState.orderId,
    orderId: orderState.orderId,
    type: 'mart',
    summary: `${totalQty} item${totalQty !== 1 ? 's' : ''} from CalebDeck Mart`,
    total: orderState.total || orderState.totalAmount || 0,
    status: orderState.status || 'PAID',
    hostelName: orderState.hostelName || orderState.hostel,
    createdAt: new Date().toISOString()
  };
}

/** Build entry from CalebNet transaction */
export function buildCalebNetEntry(data: {
  network: string;
  type: 'data' | 'airtime';
  amount: number;
  phoneNumber: string;
  planName?: string;
  reference: string;
}): OrderHistoryEntry {
  const summary = data.type === 'data'
    ? `${data.network} ${data.planName || 'Data'}`
    : `${data.network} ₦${data.amount.toLocaleString()} Airtime`;

  return {
    id: data.reference,
    orderId: data.reference.slice(0, 18),
    type: 'calebnet',
    summary,
    total: data.amount,
    status: 'PROCESSING',
    createdAt: new Date().toISOString()
  };
}

/** Build entry from fashion order success state */
export function buildFashionOrderEntry(orderState: any): OrderHistoryEntry {
  const itemCount = orderState.items?.length || 0;
  const totalQty = orderState.items?.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0) || 0;
  
  return {
    id: orderState.firestoreOrderId || orderState.paymentReference || orderState.orderId,
    orderId: orderState.orderId,
    type: 'fashion',
    summary: `${totalQty} item${totalQty !== 1 ? 's' : ''} from CalebDeck Fashion`,
    total: orderState.total || orderState.totalAmount || 0,
    status: orderState.status || 'ORDER_PLACED',
    hostelName: orderState.hostelName || orderState.hostel,
    createdAt: new Date().toISOString()
  };
}
