import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const BillingContext = createContext(null);

export const BillingProvider = ({ children }) => {
  const { shop, token, isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [customer, setCustomer] = useState({ name: 'Walk-in Customer', phone: '', balanceDue: 0 });
  const [billDiscount, setBillDiscount] = useState(0);
  const [notes, setNotes] = useState('');
  const [heldBills, setHeldBills] = useState([]);
  const [isWithoutGstMode, setIsWithoutGstMode] = useState(() => localStorage.getItem('simple_billing_without_gst') === 'true');

  const toggleWithoutGstMode = (val) => {
    setIsWithoutGstMode(prev => {
      const next = typeof val === 'boolean' ? val : !prev;
      localStorage.setItem('simple_billing_without_gst', String(next));
      return next;
    });
  };

  // Fetch held bills only when user is authenticated
  const fetchHeldBills = async () => {
    if (!token && !localStorage.getItem('simple_billing_token')) return;
    try {
      const res = await axios.get('/api/bills/held/all');
      setHeldBills(res.data || []);
    } catch (e) {
      // Ignore unauthorized or network errors
    }
  };

  useEffect(() => {
    if (token || localStorage.getItem('simple_billing_token')) {
      fetchHeldBills();
    } else {
      setHeldBills([]);
    }
  }, [token, isAuthenticated]);

  const addItem = (item, qty = 1, customRate = null) => {
    setCartItems(prev => {
      const existingIdx = prev.findIndex(i => (i.itemId && i.itemId === item._id) || i.name === item.name);
      const rate = customRate !== null ? customRate : (item.sellingPrice || 0);

      if (existingIdx >= 0) {
        // Increment quantity
        const updated = [...prev];
        const newQty = updated[existingIdx].qty + qty;
        const lineDisc = updated[existingIdx].lineDiscount || 0;
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: newQty,
          amount: Math.max(0, (newQty * updated[existingIdx].rate) - lineDisc)
        };
        return updated;
      } else {
        const lineAmount = Math.max(0, (qty * rate));
        return [
          ...prev,
          {
            itemId: item._id || null,
            name: item.name,
            translations: item.translations || {},
            qty,
            unit: item.unit || 'pcs',
            rate,
            lineDiscount: 0,
            amount: lineAmount,
            purchasePrice: item.purchasePrice || 0,
            gstPercent: item.gstPercent || 0,
            hsn: item.hsn || '',
            allowDecimals: item.allowDecimals || false
          }
        ];
      }
    });
  };

  const updateQty = (idx, newQty) => {
    setCartItems(prev => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      const q = Math.max(0.001, parseFloat(newQty) || 1);
      const disc = updated[idx].lineDiscount || 0;
      updated[idx] = {
        ...updated[idx],
        qty: q,
        amount: Math.max(0, (q * updated[idx].rate) - disc)
      };
      return updated;
    });
  };

  const updateRate = (idx, newRate) => {
    setCartItems(prev => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      const r = Math.max(0, parseFloat(newRate) || 0);
      const disc = updated[idx].lineDiscount || 0;
      updated[idx] = {
        ...updated[idx],
        rate: r,
        amount: Math.max(0, (updated[idx].qty * r) - disc)
      };
      return updated;
    });
  };

  const updateLineDiscount = (idx, discount) => {
    setCartItems(prev => {
      const updated = [...prev];
      if (!updated[idx]) return prev;
      const d = Math.max(0, parseFloat(discount) || 0);
      updated[idx] = {
        ...updated[idx],
        lineDiscount: d,
        amount: Math.max(0, (updated[idx].qty * updated[idx].rate) - d)
      };
      return updated;
    });
  };

  const removeItem = (idx) => {
    setCartItems(prev => prev.filter((_, i) => i !== idx));
  };

  const clearCart = () => {
    setCartItems([]);
    setCustomer({ name: 'Walk-in Customer', phone: '', balanceDue: 0 });
    setBillDiscount(0);
    setNotes('');
  };

  // Calculations
  const calculations = useMemo(() => {
    let subTotal = 0;
    let taxAmount = 0;
    let taxableAmount = 0;

    const chargeGst = !isWithoutGstMode && Boolean(shop?.chargeGst);

    for (const line of cartItems) {
      subTotal += line.amount;
      const gst = line.gstPercent || 0;
      if (chargeGst && gst > 0) {
        if (shop?.priceIncludesGst) {
          const base = line.amount / (1 + (gst / 100));
          taxAmount += (line.amount - base);
          taxableAmount += base;
        } else {
          taxAmount += (line.amount * (gst / 100));
          taxableAmount += line.amount;
        }
      } else {
        taxableAmount += line.amount;
      }
    }

    const discount = parseFloat(billDiscount) || 0;
    const taxableAfterDisc = Math.max(0, taxableAmount - discount);
    let grand = chargeGst && !shop?.priceIncludesGst
      ? Math.max(0, subTotal - discount + taxAmount)
      : Math.max(0, subTotal - discount);

    let roundOff = 0;
    if (shop?.roundOff !== false) {
      const rounded = Math.round(grand);
      roundOff = rounded - grand;
      grand = rounded;
    }

    const cgstAmount = taxAmount / 2;
    const sgstAmount = taxAmount / 2;

    return {
      subTotal: Math.round(subTotal * 100) / 100,
      billDiscount: discount,
      taxableAmount: Math.round(taxableAfterDisc * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      cgstAmount: Math.round(cgstAmount * 100) / 100,
      sgstAmount: Math.round(sgstAmount * 100) / 100,
      roundOff: Math.round(roundOff * 100) / 100,
      grandTotal: grand,
      totalItems: cartItems.length,
      totalQty: cartItems.reduce((sum, item) => sum + item.qty, 0),
      isWithoutGst: isWithoutGstMode
    };
  }, [cartItems, billDiscount, shop, isWithoutGstMode]);

  const holdCurrentBill = async (note = '') => {
    if (cartItems.length === 0) return false;
    try {
      await axios.post('/api/bills/hold', {
        customerName: customer.name,
        customerPhone: customer.phone,
        items: cartItems,
        subTotal: calculations.subTotal,
        billDiscount,
        note
      });
      clearCart();
      fetchHeldBills();
      return true;
    } catch {
      return false;
    }
  };

  const resumeHeldBill = async (held) => {
    setCartItems(held.items || []);
    setCustomer({
      name: held.customerName || 'Walk-in Customer',
      phone: held.customerPhone || '',
      balanceDue: 0
    });
    setBillDiscount(held.billDiscount || 0);
    setNotes(held.note || '');
    try {
      await axios.delete(`/api/bills/hold/${held._id}`);
      fetchHeldBills();
    } catch {
      // Ignore
    }
  };

  return (
    <BillingContext.Provider
      value={{
        cartItems,
        addItem,
        updateQty,
        updateRate,
        updateLineDiscount,
        removeItem,
        clearCart,
        customer,
        setCustomer,
        billDiscount,
        setBillDiscount,
        notes,
        setNotes,
        calculations,
        heldBills,
        holdCurrentBill,
        resumeHeldBill,
        fetchHeldBills,
        isWithoutGstMode,
        setIsWithoutGstMode,
        toggleWithoutGstMode
      }}
    >
      {children}
    </BillingContext.Provider>
  );
};

export const useBilling = () => useContext(BillingContext);
