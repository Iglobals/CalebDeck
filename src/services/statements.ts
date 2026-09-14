/**
 * Account statements: render a print-ready statement document (Save as PDF)
 * for a chosen month, from order or wallet-transaction data.
 *
 * Do not @import Google Fonts here. Safari/iOS defers window.print() until
 * pending stylesheets finish (or hit a ~30s timeout), which made the print
 * sheet look broken while the button went idle. Inter is already loaded by
 * the app in src/styles/fonts.css.
 */

const escapeHtml = (value: any) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const ngn = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

let printLock = false;

function waitNextPaint(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
}

function printStatement(title: string, bodyHtml: string): Promise<void> {
    if (printLock) return Promise.resolve();
    printLock = true;

    document.querySelectorAll('.statement-print-root').forEach((node) => node.remove());

    const previousTitle = document.title;
    const printRoot = document.createElement('div');
    printRoot.className = 'statement-print-root';
    printRoot.innerHTML = `
        <style>
            .statement-print-page { box-sizing: border-box; font-family: Inter, system-ui, -apple-system, Arial, sans-serif; padding: 32px; color: #141414; background: #fff; max-width: 860px; margin: 0 auto; }
            .statement-print-page * { box-sizing: border-box; }
            .statement-print-page .topbar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7C3AED; padding-bottom: 16px; margin-bottom: 22px; }
            .statement-print-page .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
            .statement-print-page .brand span { color: #7C3AED; }
            .statement-print-page h1 { font-size: 17px; margin: 6px 0 2px; }
            .statement-print-page .meta { color: #666; font-size: 12px; line-height: 1.5; }
            .statement-print-page .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
            .statement-print-page .card { border: 1px solid #e7e2f4; border-radius: 8px; padding: 12px; background: #fbfaff; }
            .statement-print-page .label { font-size: 9px; text-transform: uppercase; letter-spacing: .12em; color: #665a77; font-weight: 900; }
            .statement-print-page .value { font-size: 17px; font-weight: 900; margin-top: 5px; }
            .statement-print-page table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
            .statement-print-page th, .statement-print-page td { border-bottom: 1px solid #ececec; padding: 8px; text-align: left; vertical-align: top; }
            .statement-print-page th { background: #f7f5fb; text-transform: uppercase; font-size: 9px; letter-spacing: .08em; color: #6b5b7e; }
            .statement-print-page td.num, .statement-print-page th.num { text-align: right; white-space: nowrap; }
            .statement-print-page .credit { color: #10B981; font-weight: 700; }
            .statement-print-page .debit { color: #ef4444; font-weight: 700; }
            .statement-print-page .empty { text-align: center; color: #777; padding: 22px; }
            .statement-print-page .footer { margin-top: 26px; border-top: 2px solid #7C3AED; padding-top: 12px; text-align: center; font-size: 10px; font-weight: 700; color: #9C8F7F; }
            @media screen { .statement-print-root { display: none; } }
            @media print {
                @page { size: auto; margin: 1cm; }
                html, body { height: auto !important; max-width: none !important; overflow: visible !important; background: #fff !important; }
                body > *:not(.statement-print-root) { display: none !important; }
                .statement-print-root { display: block !important; }
                .statement-print-page { max-width: none; padding: 0; }
                body { margin: 0 !important; }
            }
        </style>
        <main class="statement-print-page" aria-label="${escapeHtml(title)}">
            ${bodyHtml}
            <div class="footer">CalebDeck - This statement was generated from your account activity.</div>
        </main>
    `;
    document.title = title;
    document.body.appendChild(printRoot);

    let cleaned = false;
    let lockTimeout = 0;
    let orphanTimeout = 0;
    const printMedia = window.matchMedia?.('print');
    const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        printRoot.remove();
        document.title = previousTitle;
        printLock = false;
        window.removeEventListener('afterprint', cleanup);
        printMedia?.removeEventListener?.('change', onPrintMedia);
        window.clearTimeout(lockTimeout);
        window.clearTimeout(orphanTimeout);
    };
    const onPrintMedia = (event: MediaQueryListEvent) => {
        if (!event.matches) cleanup();
    };

    printMedia?.addEventListener?.('change', onPrintMedia);
    window.addEventListener('afterprint', cleanup, { once: true });

    return waitNextPaint().then(() => {
        try {
            window.print();
        } catch {
            cleanup();
            return;
        }
        // Extra taps while iOS is still presenting the sheet should no-op.
        lockTimeout = window.setTimeout(() => { printLock = false; }, 2500);
        // iOS often skips afterprint; drop an orphaned print layer later.
        orphanTimeout = window.setTimeout(() => {
            if (!window.matchMedia?.('print').matches) cleanup();
        }, 60000);
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
        <table>
            <thead><tr><th>Date</th><th>Order</th><th>Type</th><th>Details</th><th>Status</th><th class="num">Amount</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="empty">No orders in this period</td></tr>'}</tbody>
        </table>
    `;
    return printStatement(`Order Statement - ${periodLabel}`, body);
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
        <table>
            <thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Reference</th><th class="num">Amount</th><th class="num">Balance After</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="6" class="empty">No transactions in this period</td></tr>'}</tbody>
        </table>
    `;
    return printStatement(`Wallet Statement - ${periodLabel}`, body);
}
