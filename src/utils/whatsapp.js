export const generateWhatsAppLink = (phone, message) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
};

export const formatBillMessage = (bill) => {
    const date = new Date(bill.generatedDate).toLocaleDateString('en-IN');
    return `*SLN Cable & Internet Services*\n\n` +
        `Dear *${bill.customerName}*,\n\n` +
        `Your bill for ${date} has been generated.\n` +
        `*Bill No:* #${bill.billNumber}\n` +
        `*Total Amount:* ₹${bill.totalAmount}\n` +
        `*Paid Amount:* ₹${bill.amountPaid || 0}\n` +
        `*Balance Due:* ₹${bill.balance}\n\n` +
        `Thank you for using our services!`;
};

export const formatPaymentMessage = (customerName, amount, balance) => {
    return `*SLN Cable & Internet Services*\n\n` +
        `Dear *${customerName}*,\n\n` +
        `We have received your payment of *₹${amount}*.\n` +
        `*Current Balance:* ₹${balance}\n\n` +
        `Thank you!`;
};
