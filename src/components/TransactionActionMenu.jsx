import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileX, DollarSign, HandCoins } from 'lucide-react';

const TransactionActionMenu = ({ menuState, onClose, onWriteOff, onPay }) => {
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [onClose]);

    if (!menuState.isOpen) return null;

    const { transaction } = menuState;
    const isSettled = ['paid', 'received'].includes(transaction.status);
    const isPayable = transaction.type === 'payable';

    const menuItems = [
        { label: isPayable ? 'Payer' : 'Encaisser', icon: isPayable ? DollarSign : HandCoins, action: onPay, disabled: isSettled },
        { label: 'Passer en perte', icon: FileX, action: onWriteOff, disabled: isSettled },
    ];

    return (
        <div
            ref={menuRef}
            style={{ top: menuState.y, left: menuState.x }}
            className="fixed z-[60]"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="bg-white rounded-lg shadow-2xl border border-gray-200 w-56 p-2"
            >
                <ul className="space-y-1">
                    {menuItems.map(item => (
                        <li key={item.label}>
                            <button
                                onClick={() => { if (!item.disabled) { item.action(transaction); onClose(); } }}
                                disabled={item.disabled}
                                title={item.tooltip}
                                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                            >
                                <item.icon className="w-4 h-4" />
                                <span>{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </motion.div>
        </div>
    );
};

export default TransactionActionMenu;
