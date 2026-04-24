export const generateWhatsAppLink = (phone, message) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
};

const fmtAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const serviceLabel = (type) => {
    if (type === 'both') return 'Cable TV & Internet';
    if (type === 'tv') return 'Cable TV';
    if (type === 'internet') return 'Internet';
    return 'Cable & Internet Services';
};

const billMonthLabel = (dateStr) => {
    try {
        const d = new Date(dateStr + 'T00:00:00');
        return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
    } catch { return ''; }
};

export const formatBillMessage = (bill) => {
    const month = billMonthLabel(bill.generatedDate);
    const dateStr = new Date(bill.generatedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const total = bill.totalAmount || 0;
    const paid = bill.amountPaid || 0;
    const balance = bill.balance ?? (total - paid);
    const status = bill.status || (balance <= 0 ? 'Paid' : paid > 0 ? 'Partial' : 'Due');
    const payCount = (bill.payments || []).length;

    // Service amount breakdown
    let serviceBreakdown = '';
    if (bill.serviceType === 'both' && bill.tvAmount && bill.internetAmount) {
        serviceBreakdown = `   📺 Cable TV : ${fmtAmt(bill.tvAmount)}\n   🌐 Internet  : ${fmtAmt(bill.internetAmount)}\n`;
    }

    // Balance by service (for both-type bills)
    let balanceBreakdown = '';
    if (balance > 0 && bill.serviceType === 'both' && bill.tvAmount && bill.internetAmount) {
        const tvBal = Math.round(balance * (bill.tvAmount / total));
        const netBal = balance - tvBal;
        balanceBreakdown = `   📺 TV due      : ${fmtAmt(tvBal)}\n   🌐 Internet due: ${fmtAmt(netBal)}\n`;
    }

    // Status line
    let statusLine = '';
    if (status === 'Paid' || balance <= 0) {
        statusLine = `✅ *STATUS: FULLY PAID*`;
    } else if (paid > 0) {
        statusLine = `⚠️ *STATUS: PARTIAL — ${payCount} payment${payCount > 1 ? 's' : ''} made*`;
    } else {
        statusLine = `🔴 *STATUS: PAYMENT DUE*`;
    }

    return `*SLN Cable & Internet Services*\n\n` +
        `Dear *${bill.customerName}*,\n\n` +
        `Your bill for *${month}* has been generated.\n\n` +
        `📋 *Bill No :* #${bill.billNumber}\n` +
        `📅 *Date    :* ${dateStr}\n` +
        `📡 *Service :* ${serviceLabel(bill.serviceType)}\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💰 *Bill Summary:*\n` +
        serviceBreakdown +
        `   Total Amount : *${fmtAmt(total)}*\n` +
        `   Amount Paid  : ${fmtAmt(paid)}\n` +
        `   Balance Due  : *${fmtAmt(Math.max(0, balance))}*\n` +
        (balanceBreakdown ? balanceBreakdown : '') +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        statusLine + `\n\n` +
        (balance > 0
            ? `Please pay the balance at your earliest convenience.\n\n`
            : `Thank you for the timely payment!\n\n`) +
        `Thank you for choosing SLN Cable! 🙏`;
};

export const formatPaymentMessage = (bill, paymentAmount, paymentDate) => {
    // Handle case where bill might be a string (old bug) or missing fields
    const b = (typeof bill === 'string') ? { customerName: bill } : (bill || {});

    const total = b.totalAmount || 0;
    const paid = b.amountPaid || 0;
    const balance = b.balance ?? (total > 0 ? (total - paid) : 0);
    const payments = b.payments || [];
    const payCount = payments.length;

    const paymentLabel =
        payCount === 1 ? '1st payment' :
            payCount === 2 ? '2nd payment' :
                payCount === 3 ? '3rd payment' :
                    payCount > 0 ? `${payCount}th payment` : 'Payment';

    const thisPayment = paymentAmount ?? (payments.length > 0 ? payments[payments.length - 1]?.amount : paid);

    // Payment date display
    const dateToShow = paymentDate || b.paymentDate || new Date().toISOString().split('T')[0];
    const payDateStr = (() => {
        try {
            return new Date(dateToShow + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch { return dateToShow; }
    })();

    // Balance by service (for both-type bills)
    let balanceBreakdown = '';
    if (balance > 0 && b.serviceType === 'both' && b.tvAmount && b.internetAmount) {
        const tvBal = Math.round(balance * (b.tvAmount / total));
        const netBal = balance - tvBal;
        balanceBreakdown = `   📺 TV due      : ${fmtAmt(tvBal)}\n   🌐 Internet due: ${fmtAmt(netBal)}\n`;
    }

    // Status line
    let statusLine = '';
    if (balance <= 0 && total > 0) {
        statusLine = `✅ *Bill fully cleared! No balance remaining.*`;
    } else if (balance > 0) {
        statusLine = `⚠️ *Balance still due — please pay at your earliest.*`;
    } else {
        statusLine = `✅ *Payment received successfully.*`;
    }

    const billInfo = b.billNumber && b.billNumber !== 'MULTIPLE' ? `📋 *Bill No :* #${b.billNumber}\n` : '';

    const pastPayments = payments.slice(0, -1);
    let pastPaymentsStr = '';
    pastPayments.forEach((p, i) => {
        const idx = i + 1;
        let label = `${idx}th payment`;
        if (idx === 1) label = '1st payment';
        else if (idx === 2) label = '2nd payment';
        else if (idx === 3) label = '3rd payment';
        pastPaymentsStr += `   ${label.padEnd(14, ' ')}: ${fmtAmt(p.amount)}\n`;
    });

    return `*SLN Cable & Internet Services*\n\n` +
        `Dear *${b.customerName || 'Customer'}*,\n\n` +
        `✅ Payment received! Thank you.\n\n` +
        billInfo +
        `📅 *Date    :* ${payDateStr}\n` +
        `📡 *Service :* ${serviceLabel(b.serviceType)}\n\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `💳 *Payment Summary:*\n` +
        (total > 0 ? `   Total Amount  : ${fmtAmt(total)}\n` : '') +
        pastPaymentsStr +
        `   This Payment  : *${fmtAmt(thisPayment)}*${paymentLabel !== 'Payment' ? ` (${paymentLabel})` : ''}\n` +
        (total > 0 ? `   Total Paid    : ${fmtAmt(paid)}\n` : '') +
        `   Balance Due   : *${fmtAmt(Math.max(0, balance))}*\n` +
        (balanceBreakdown ? balanceBreakdown : '') +
        `━━━━━━━━━━━━━━━━━━━\n\n` +
        statusLine + `\n\n` +
        `Thank you for using SLN Cable! 🙏`;
};
