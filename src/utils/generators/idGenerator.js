/**
 * Utility for generating unique IDs for various collections in DeynCare
 */

/**
 * Generates a unique ID with a prefix and padding
 * @param {string} prefix - The prefix for the ID (e.g., 'USR', 'SHOP')
 * @param {number} lastId - The last used ID number
 * @param {number} padLength - The length to pad the number to (default: 3)
 * @returns {string} - The formatted ID (e.g., 'USR001')
 */
const generateId = (prefix, lastId, padLength = 3) => {
  const nextId = lastId + 1;
  return `${prefix}${nextId.toString().padStart(padLength, '0')}`;
};

/**
 * ID generators for each collection
 */
module.exports = {
  generateUserId: async (User) => {
    const lastUser = await User.findOne({}, { userId: 1 }).sort({ createdAt: -1 });
    const lastId = lastUser ? parseInt(lastUser.userId.replace('USR', '')) : 0;
    return generateId('USR', lastId);
  },
  
  generateShopId: async (Shop) => {
    const lastShop = await Shop.findOne({}, { shopId: 1 }).sort({ createdAt: -1 });
    const lastId = lastShop ? parseInt(lastShop.shopId.replace('SHOP', '')) : 0;
    return generateId('SHOP', lastId);
  },
  
  generateSubscriptionId: async (Subscription) => {
    const lastSub = await Subscription.findOne({}, { subscriptionId: 1 }).sort({ createdAt: -1 });
    const lastId = lastSub ? parseInt(lastSub.subscriptionId.replace('SUB', '')) : 0;
    return generateId('SUB', lastId);
  },
  
  generateCustomerId: async (Customer) => {
    const lastCustomer = await Customer.findOne({}, { customerId: 1 }).sort({ createdAt: -1 });
    const lastId = lastCustomer ? parseInt(lastCustomer.customerId.replace('CUST', '')) : 0;
    return generateId('CUST', lastId);
  },
  
  generateDebtId: async (Debt) => {
    const lastDebt = await Debt.findOne({}, { debtId: 1 }).sort({ createdAt: -1 });
    const lastId = lastDebt ? parseInt(lastDebt.debtId.replace('DEBT', '')) : 0;
    return generateId('DEBT', lastId);
  },
  
  generatePaymentId: async (Payment) => {
    const lastPayment = await Payment.findOne({}, { paymentId: 1 }).sort({ createdAt: -1 });
    const lastId = lastPayment ? parseInt(lastPayment.paymentId.replace('PAY', '')) : 0;
    return generateId('PAY', lastId);
  },
  
  generateSaleId: async (Sale) => {
    const lastSale = await Sale.findOne({}, { saleId: 1 }).sort({ createdAt: -1 });
    const lastId = lastSale ? parseInt(lastSale.saleId.replace('SALE', '')) : 0;
    return generateId('SALE', lastId);
  },
  
  generateProductId: async (Product) => {
    const lastProduct = await Product.findOne({}, { productId: 1 }).sort({ createdAt: -1 });
    const lastId = lastProduct ? parseInt(lastProduct.productId.replace('PRD', '')) : 0;
    return generateId('PRD', lastId);
  },
  
  generateNotificationId: async (Notification) => {
    const lastNotification = await Notification.findOne({}, { notificationId: 1 }).sort({ createdAt: -1 });
    const lastId = lastNotification ? parseInt(lastNotification.notificationId.replace('NTF', '')) : 0;
    return generateId('NTF', lastId);
  },
  
  generateFileId: async (File) => {
    const lastFile = await File.findOne({}, { fileId: 1 }).sort({ createdAt: -1 });
    const lastId = lastFile ? parseInt(lastFile.fileId.replace('FILE', '')) : 0;
    return generateId('FILE', lastId);
  },
  
  generateSessionId: async (Session) => {
    const lastSession = await Session.findOne({}, { sessionId: 1 }).sort({ createdAt: -1 });
    const lastId = lastSession ? parseInt(lastSession.sessionId.replace('SESS', '')) : 0;
    return generateId('SESS', lastId);
  },
  
  generateFinancialSnapshotId: async (FinancialSnapshot) => {
    const lastSnapshot = await FinancialSnapshot.findOne({}, { snapshotId: 1 }).sort({ generatedAt: -1 });
    const lastId = lastSnapshot ? parseInt(lastSnapshot.snapshotId.replace('FS', '')) : 0;
    return generateId('FS', lastId);
  },
  
  generateReportId: async (Report) => {
    const lastReport = await Report.findOne({}, { reportId: 1 }).sort({ generatedAt: -1 });
    const lastId = lastReport ? parseInt(lastReport.reportId.replace('REP', '')) : 0;
    return generateId('REP', lastId);
  }
};
