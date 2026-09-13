/**
 * Account statements: render a print-ready statement document (Save as PDF)
 * for a chosen month, from order or wallet-transaction data.
 */

const escapeHtml = (value: any) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const ngn = (n: number) => `₦${Number(n || 0).toLocaleString()}`;

function openStatementWindow(title: string, bodyHtml: string) {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to download your statement.');
        return;
    }
    printWindow.document.write(`
        <html>
            <head>
                <title>${escapeHtml(title)}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
                    * { box-sizing: border-box; }
                    body { font-family: Inter, Arial, sans-serif; padding: 32px; color: #141414; background: #fff; max-width: 860px; margin: 0 auto; }
                    .topbar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #7C3AED; padding-bottom: 16px; margin-bottom: 22px; }
                    .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
                    .brand span { color: #7C3AED; }
                    h1 { font-size: 17px; margin: 6px 0 2px; }
                    .meta { color: #666; font-size: 12px; line-height: 1.5; }
                    .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 18px 0; }
                    .card { border: 1px solid #e7e2f4; border-radius: 8px; padding: 12px; background: #fbfaff; }
                    .label { font-size: 9px; text-transform: uppercase; letter-spacing: .12em; color: #665a77; font-weight: 900; }
                    .value { font-size: 17px; font-weight: 900; margin-top: 5px; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 8px; }
                    th, td { border-bottom: 1px solid #ececec; padding: 8px; text-align: left; vertical-align: top; }
                    th { background: #f7f5fb; text-transform: uppercase; font-size: 9px; letter-spacing: .08em; color: #6b5b7e; }
                    td.num, th.num { text-align: right; white-space: nowrap; }
                    .credit { color: #10B981; font-weight: 700; }
                    .debit { color: #ef4444; font-weight: 700; }
                    .empty { text-align: center; color: #777; padding: 22px; }
                    .footer { margin-top: 26px; border-top: 2px solid #7C3AED; padding-top: 12px; text-align: center; font-size: 10px; font-weight: 700; color: #9C8F7F; }
                    .actions { margin-top: 16px; display: flex; gap: 10px; justify-content: flex-end; }
                    .print-btn, .close-btn { padding: 11px 16px; border: 0; border-radius: 8px; color: #fff; font-weight: 900; cursor: pointer; }
                    .print-btn { background: #7C3AED; }
                    .close-btn { background: #171717; }
                    @media print { .actions { display: none; } body { padding: 0; } }
                </style>
            </head>
            <body>
                ${bodyHtml}
                <div class="footer">CalebDeck — This statement was generated from your account activity.</div>
                <div class="actions">
                    <button class="print-btn" onclick="window.print()">Print / Save PDF</button>
                    <button class="close-btn" onclick="closeStatement()">Close</button>
                </div>
                <script>
                    function closeStatement() {
                        try { window.close(); } catch (e) {}
                        setTimeout(function () { if (!window.closed) window.history.back(); }, 150);
                    }
                </script>
            </body>
        </html>
    `);
    printWindow.document.close();
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

const STATEMENT_STYLES = `
    .grid { grid-template-columns: repeat(3, 1fr); }
`;

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
    openStatementWindow(`Order Statement — ${periodLabel}`, body);
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
    openStatementWindow(`Wallet Statement — ${periodLabel}`, body);
}
