/**
 * Account statements: render a print-ready statement in an in-page overlay
 * (Save as PDF via the native print sheet). iOS standalone PWAs block
 * window.open(), and they also drop window.print() after an async fetch
 * because the original tap is no longer a user gesture — so we show the
 * overlay first, then print from the overlay button.
 */

const OVERLAY_ID = 'calebdeck-statement-overlay';

const escapeHtml = (value: any) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const ngn = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

let previousTitle = '';
let previousOverflow = '';
let previousFocus: HTMLElement | null = null;

function onStatementEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') closeStatementOverlay();
}

function closeStatementOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.remove();
    document.body.style.overflow = previousOverflow;
    if (previousTitle) document.title = previousTitle;
    window.removeEventListener('keydown', onStatementEscape);
    previousFocus?.focus?.();
    previousFocus = null;
}

function openStatementPreview(title: string, bodyHtml: string) {
    closeStatementOverlay();

    previousTitle = document.title;
    previousOverflow = document.body.style.overflow;
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', title);
    overlay.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
            #${OVERLAY_ID} {
                position: fixed;
                inset: 0;
                z-index: 99999;
                background: rgba(15, 15, 15, 0.62);
                overflow: auto;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
                padding: max(16px, env(safe-area-inset-top, 0px)) 16px max(16px, env(safe-area-inset-bottom, 0px));
            }
            #${OVERLAY_ID} .statement-sheet {
                box-sizing: border-box;
                background: #fff;
                color: #141414;
                max-width: 860px;
                margin: 0 auto;
                border-radius: 16px;
                padding: 24px 20px 16px;
                box-shadow: 0 24px 64px rgba(0, 0, 0, 0.28);
            }
            #${OVERLAY_ID} .statement-print-page { box-sizing: border-box; font-family: Inter, Arial, sans-serif; color: #141414; background: #fff; }
            #${OVERLAY_ID} .statement-print-page * { box-sizing: border-box; }
            #${OVERLAY_ID} .topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; border-bottom: 3px solid #7C3AED; padding-bottom: 16px; margin-bottom: 22px; }
            #${OVERLAY_ID} .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
            #${OVERLAY_ID} .brand span { color: #7C3AED; }
            #${OVERLAY_ID} h1 { font-size: 17px; margin: 6px 0 2px; }
            #${OVERLAY_ID} .meta { color: #666; font-size: 12px; line-height: 1.5; }
            #${OVERLAY_ID} .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
            #${OVERLAY_ID} .card { border: 1px solid #e7e2f4; border-radius: 8px; padding: 12px; background: #fbfaff; }
            #${OVERLAY_ID} .label { font-size: 9px; text-transform: uppercase; letter-spacing: .12em; color: #665a77; font-weight: 900; }
            #${OVERLAY_ID} .value { font-size: 17px; font-weight: 900; margin-top: 5px; }
            #${OVERLAY_ID} .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
            #${OVERLAY_ID} table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; min-width: 520px; }
            #${OVERLAY_ID} th, #${OVERLAY_ID} td { border-bottom: 1px solid #ececec; padding: 8px; text-align: left; vertical-align: top; }
            #${OVERLAY_ID} th { background: #f7f5fb; text-transform: uppercase; font-size: 9px; letter-spacing: .08em; color: #6b5b7e; }
            #${OVERLAY_ID} td.num, #${OVERLAY_ID} th.num { text-align: right; white-space: nowrap; }
            #${OVERLAY_ID} .credit { color: #10B981; font-weight: 700; }
            #${OVERLAY_ID} .debit { color: #ef4444; font-weight: 700; }
            #${OVERLAY_ID} .empty { text-align: center; color: #777; padding: 22px; }
            #${OVERLAY_ID} .footer { margin-top: 26px; border-top: 2px solid #7C3AED; padding-top: 12px; text-align: center; font-size: 10px; font-weight: 700; color: #9C8F7F; }
            #${OVERLAY_ID} .statement-actions { position: sticky; bottom: 0; margin-top: 16px; display: flex; flex-wrap: wrap; gap: 10px; justify-content: flex-end; padding-top: 12px; background: #fff; }
            #${OVERLAY_ID} .print-btn, #${OVERLAY_ID} .close-btn { padding: 11px 16px; border: 0; border-radius: 8px; color: #fff; font-weight: 900; cursor: pointer; }
            #${OVERLAY_ID} .print-btn { background: #7C3AED; }
            #${OVERLAY_ID} .close-btn { background: #171717; }
            #${OVERLAY_ID} .hint { width: 100%; margin: 0; color: #666; font-size: 11px; line-height: 1.4; }
            @media (max-width: 640px) {
                #${OVERLAY_ID} .grid { grid-template-columns: 1fr; }
                #${OVERLAY_ID} .topbar { flex-direction: column; }
            }
            @media print {
                @page { size: auto; margin: 12mm; }
                html, body {
                    height: auto !important;
                    max-width: none !important;
                    overflow: visible !important;
                    background: #fff !important;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                body > *:not(#${OVERLAY_ID}) { display: none !important; }
                #${OVERLAY_ID} {
                    position: static !important;
                    inset: auto !important;
                    display: block !important;
                    background: #fff !important;
                    padding: 0 !important;
                    overflow: visible !important;
                    height: auto !important;
                    max-height: none !important;
                    min-height: 0 !important;
                    box-shadow: none !important;
                }
                #${OVERLAY_ID} .statement-sheet {
                    box-shadow: none !important;
                    max-width: none !important;
                    margin: 0 !important;
                    border-radius: 0 !important;
                    padding: 0 !important;
                    max-height: none !important;
                    overflow: visible !important;
                }
                #${OVERLAY_ID} .table-wrap { overflow: visible !important; }
                #${OVERLAY_ID} table { min-width: 0 !important; }
                #${OVERLAY_ID} .statement-actions, #${OVERLAY_ID} .hint { display: none !important; }
            }
        </style>
        <div class="statement-sheet">
            <main class="statement-print-page">
                ${bodyHtml}
                <div class="footer">CalebDeck — This statement was generated from your account activity.</div>
            </main>
            <div class="statement-actions">
                <p class="hint">On iPhone, tap Print / Save PDF, then choose Save to Files or Save as PDF.</p>
                <button type="button" class="close-btn" data-statement-close>Close</button>
                <button type="button" class="print-btn" data-statement-print>Print / Save PDF</button>
            </div>
        </div>
    `;

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) closeStatementOverlay();
    });
    overlay.querySelector('[data-statement-close]')?.addEventListener('click', closeStatementOverlay);
    overlay.querySelector('[data-statement-print]')?.addEventListener('click', () => {
        window.print();
    });

    document.body.style.overflow = 'hidden';
    document.title = title;
    document.body.appendChild(overlay);
    window.addEventListener('keydown', onStatementEscape);
    requestAnimationFrame(() => {
        overlay.querySelector<HTMLButtonElement>('[data-statement-print]')?.focus();
    });
}

function statementHead(title: string, periodLabel: string, accountName: string, accountDetail: string) {
    return `
        <div class="topbar">
            <div>
                <div class="brand">CALEB<span>DECK</span></div>
                <h1>${escapeHtml(title)}</h1>
                <div class="meta">${escapeHtml(periodLabel)} · Generated ${new Date().toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            </div>
            <div class="meta" style="text-align:right">
                <strong>${escapeHtml(accountName || 'Student')}</strong><br/>
                ${escapeHtml(accountDetail)}
            </div>
        </div>
    `;
}

/** Order statement for one month. entries: OrderHistoryEntry[] */
export function openOrderStatement(
    entries: { orderId: string; type: string; summary: string; status: string; total: number; createdAt: string }[],
    periodLabel: string,
    accountName: string,
    accountDetail: string
) {
    const totalSpend = entries.reduce((s, e) => s + (e.total || 0), 0);
    const byType = entries.reduce<Record<string, number>>((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
    }, {});
    const typeSummary = Object.entries(byType).map(([t, c]) => `${c} ${t}`).join(' · ') || 'None';
    const rows = entries.map(e => `
        <tr>
            <td>${new Date(e.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
            <td>${escapeHtml(e.orderId)}</td>
            <td>${escapeHtml(e.type)}</td>
            <td>${escapeHtml(e.summary)}</td>
            <td>${escapeHtml(e.status)}</td>
            <td class="num">${ngn(e.total)}</td>
        </tr>`).join('');

    const body = `
        ${statementHead('Order Statement', periodLabel, accountName, accountDetail)}
        <div class="grid">
            <div class="card"><div class="label">Orders</div><div class="value">${entries.length}</div></div>
            <div class="card"><div class="label">Total Spend</div><div class="value">${ngn(totalSpend)}</div></div>
            <div class="card"><div class="label">Breakdown</div><div class="value" style="font-size:12px">${escapeHtml(typeSummary)}</div></div>
        </div>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Date</th><th>Order</th><th>Type</th><th>Details</th><th>Status</th><th class="num">Amount</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="6" class="empty">No orders in this period</td></tr>'}</tbody>
            </table>
        </div>
    `;
    openStatementPreview(`Order Statement — ${periodLabel}`, body);
}

/** Wallet statement for one month. txs: wallet transactions in the period. */
export function openWalletStatement(
    txs: { id: string; type: string; amount: number; purpose: string; reference?: string; balanceAfter: number; createdAt?: any }[],
    periodLabel: string,
    accountName: string,
    accountDetail: string
) {
    const moneyIn = txs.filter(t => t.type !== 'debit').reduce((s, t) => s + (t.amount || 0), 0);
    const moneyOut = txs.filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);
    const rows = [...txs].sort((a, b) =>
        (Number(a.createdAt?.seconds || 0) - Number(b.createdAt?.seconds || 0))).map(t => {
            const date = t.createdAt?.seconds
                ? new Date(t.createdAt.seconds * 1000)
                : t.createdAt?.toDate ? t.createdAt.toDate() : null;
            return `
        <tr>
            <td>${date ? date.toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
            <td>${t.type === 'debit' ? 'Debit' : t.type === 'refund' ? 'Refund' : 'Credit'}</td>
            <td>${escapeHtml(String(t.purpose || '').replace(/_/g, ' '))}</td>
            <td>${escapeHtml(t.reference || t.id)}</td>
            <td class="num ${t.type === 'debit' ? 'debit' : 'credit'}">${t.type === 'debit' ? '-' : '+'}${ngn(t.amount)}</td>
            <td class="num">${ngn(t.balanceAfter)}</td>
        </tr>`;
        }).join('');

    const body = `
        ${statementHead('Wallet Statement', periodLabel, accountName, accountDetail)}
        <div class="grid">
            <div class="card"><div class="label">Money In</div><div class="value credit">${ngn(moneyIn)}</div></div>
            <div class="card"><div class="label">Money Out</div><div class="value debit">${ngn(moneyOut)}</div></div>
            <div class="card"><div class="label">Transactions</div><div class="value">${txs.length}</div></div>
        </div>
        <div class="table-wrap">
            <table>
                <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Reference</th><th class="num">Amount</th><th class="num">Balance After</th></tr></thead>
                <tbody>${rows || '<tr><td colspan="6" class="empty">No transactions in this period</td></tr>'}</tbody>
            </table>
        </div>
    `;
    openStatementPreview(`Wallet Statement — ${periodLabel}`, body);
}
