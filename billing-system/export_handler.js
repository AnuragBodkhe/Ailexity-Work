// Global Export utility for Order History (PDF and CSV)
(function() {
    'use strict';
    
    // Make exports globally available
    window.exportData = exportData;
    window.exportToPDF = exportToPDF;
    
    // Wait for the page to fully load before initializing
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM fully loaded, initializing export handler...');
        setTimeout(initializeExportButtons, 1000); // Give other scripts time to load
    });
    
    // Handle export button state
    async function handleExport(button, exportFunction) {
        if (button.getAttribute('data-exporting') === 'true') return;
        
        const originalHtml = button.innerHTML;
        button.setAttribute('data-exporting', 'true');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
        
        try {
            await exportFunction();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed: ' + (error.message || 'Unknown error'));
        } finally {
            button.disabled = false;
            button.innerHTML = originalHtml;
            button.removeAttribute('data-exporting');
        }
    }

    // Helper function to get orders for export
    function getOrdersForExport() {
        try {
            // Try to get orders from the page's scope
            const pageScope = window;
            let orders = [];
            
            console.log('Looking for orders in window object...');
            
            // Check different possible places where orders might be stored
            if (Array.isArray(pageScope.filteredOrders)) {
                console.log('Found filteredOrders with', pageScope.filteredOrders.length, 'orders');
                orders = pageScope.filteredOrders;
            } 
            
            if ((!orders || orders.length === 0) && Array.isArray(pageScope.allOrders)) {
                console.log('Using allOrders with', pageScope.allOrders.length, 'orders');
                orders = pageScope.allOrders;
            }
            
            if ((!orders || orders.length === 0) && typeof pageScope.loadOrderHistory === 'function') {
                console.log('Attempting to load orders...');
                try {
                    pageScope.loadOrderHistory();
                    // Give it a moment to load
                    setTimeout(() => {
                        if (Array.isArray(pageScope.filteredOrders) && pageScope.filteredOrders.length > 0) {
                            orders = pageScope.filteredOrders;
                        } else if (Array.isArray(pageScope.allOrders) && pageScope.allOrders.length > 0) {
                            orders = pageScope.allOrders;
                        }
                    }, 500);
                } catch (e) {
                    console.error('Error loading orders:', e);
                }
            }
            
            if (!orders || orders.length === 0) {
                console.warn('No orders found for export');
                // Try one last time to get orders directly from localStorage
                try {
                    const savedBills = JSON.parse(localStorage.getItem('bills') || '[]');
                    if (savedBills && savedBills.length > 0) {
                        console.log('Found', savedBills.length, 'bills in localStorage');
                        orders = savedBills;
                    }
                } catch (e) {
                    console.error('Error getting orders from localStorage:', e);
                }
            }
            
            console.log('Returning', orders?.length || 0, 'orders for export');
            return Array.isArray(orders) ? orders : [];
        } catch (error) {
            console.error('Error in getOrdersForExport:', error);
            return [];
        }
    }

    // Export to CSV function
    function exportData() {
        return new Promise((resolve, reject) => {
            try {
                const orders = getOrdersForExport();
                if (!orders || orders.length === 0) {
                    console.error('No orders to export - filteredOrders:', window.filteredOrders, 'allOrders:', window.allOrders);
                throw new Error('No orders found to export. Please make sure you have orders in your history and try refreshing the page.');
                }
                
                const csvContent = "data:text/csv;charset=utf-8," 
                    + "Bill No,Table,Customer,Date,Items,Subtotal,Tax,Total,Status\n"
                    + window.filteredOrders.map(order => {
                        const items = order.items.map(item => 
                            `${item.name || item.menuItem?.name || 'Item'} (x${item.quantity || 1})`
                        ).join('; ');
                        const date = order.date ? new Date(order.date).toLocaleDateString('en-GB') : 'N/A';
                        const subtotal = parseFloat(order.subtotal || order.items?.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0) || 0);
                        const taxRate = 0.18; // 18% tax
                        const tax = parseFloat(order.taxAmount || (subtotal * taxRate) || 0);
                        const total = parseFloat(order.total || order.totalAmount || (subtotal + tax) || 0);
                        
                        return `"${order.id || 'N/A'}","${order.tableNumber || 'N/A'}","${order.customerName || 'Walk-in'}","${date}","${items}",${subtotal.toFixed(2)},${tax.toFixed(2)},${total.toFixed(2)},"${order.paymentStatus || 'pending'}"`;
                    }).join("\n");

                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `order_history_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    // Export to PDF function
    async function exportToPDF() {
        console.log('Starting PDF export...');
        const orders = getOrdersForExport();
        console.log('Orders for PDF export:', orders);
        
        if (!orders || orders.length === 0) {
            throw new Error('No orders found to export. Please make sure you have orders in your history and try refreshing the page.');
        }

        if (!window.jspdf?.jsPDF) {
            await loadJsPDF();
            if (!window.jspdf?.jsPDF) {
                throw new Error('PDF library failed to load');
            }
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const lineHeight = 7;
        let yPos = 20;

        // Add title
        doc.setFontSize(18);
        doc.setTextColor(40);
        doc.text('Order History Report', pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;

        // Add date
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 10;

        // Add orders
        doc.setFontSize(12);
        doc.setTextColor(0);
        
        orders.forEach((order, index) => {
            // Add page break if needed
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }

            // Order header
            doc.setFont(undefined, 'bold');
            doc.text(`Order #${order.id || 'N/A'}`, margin, yPos);
            doc.text(`Table: ${order.tableNumber || 'N/A'}`, pageWidth - margin, yPos, { align: 'right' });
            yPos += lineHeight;

            // Order details
            doc.setFont(undefined, 'normal');
            doc.text(`Customer: ${order.customerName || 'Walk-in'}`, margin, yPos);
            doc.text(`Date: ${order.date ? new Date(order.date).toLocaleString() : 'N/A'}`, pageWidth - margin, yPos, { align: 'right' });
            yPos += lineHeight;

            // Items header
            doc.setFont(undefined, 'bold');
            doc.text('Item', margin, yPos);
            doc.text('Qty', margin + 100, yPos);
            doc.text('Price', pageWidth - margin, yPos, { align: 'right' });
            yPos += lineHeight;

            // Items list
            doc.setFont(undefined, 'normal');
            order.items.forEach(item => {
                const itemName = item.name || item.menuItem?.name || 'Item';
                const quantity = parseInt(item.quantity) || 1;
                const price = parseFloat(item.price || item.menuItem?.price || 0);
                const itemTotal = (quantity * price);
                
                doc.text(`• ${itemName}`, margin + 5, yPos);
                doc.text(`x${quantity}`, margin + 100, yPos);
                doc.text(`₹${price.toFixed(2)}`, margin + 120, yPos, { align: 'right' });
                doc.text(`₹${itemTotal.toFixed(2)}`, pageWidth - margin, yPos, { align: 'right' });
                yPos += lineHeight - 2;
            });

            // Order summary
            yPos += 5;
            doc.line(margin, yPos, pageWidth - margin, yPos);
            yPos += 5;

            // Calculate totals
            const subtotal = order.items?.reduce((sum, item) => {
                const price = parseFloat(item.price || item.menuItem?.price || 0);
                const quantity = parseInt(item.quantity) || 1;
                return sum + (price * quantity);
            }, 0) || parseFloat(order.subtotal) || 0;
            
            const taxRate = 0.18; // 18% tax
            let tax = 0;
            let total = 0;
            
            if (order.taxAmount !== undefined) {
                tax = parseFloat(order.taxAmount);
                total = parseFloat(order.total || order.totalAmount || (subtotal + tax));
            } else {
                // Calculate tax and total if not provided
                tax = subtotal * taxRate;
                total = subtotal + tax;
                // Check if there's a stored total that might include rounding differences
                if (order.total || order.totalAmount) {
                    const storedTotal = parseFloat(order.total || order.totalAmount);
                    if (Math.abs(storedTotal - total) > 0.01) {
                        // If there's a significant difference, use the stored total
                        total = storedTotal;
                        // Recalculate tax to match
                        tax = total - subtotal;
                    }
                }
            }

            // Format currency values with proper alignment
            const currencyOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
            
            // Subtotal
            doc.text(`Subtotal:`, margin + 100, yPos, { align: 'right' });
            doc.text(`₹${subtotal.toLocaleString('en-IN', currencyOptions)}`, pageWidth - margin, yPos, { align: 'right' });
            yPos += lineHeight;

            // Tax
            doc.text(`Tax (18%):`, margin + 100, yPos, { align: 'right' });
            doc.text(`₹${tax.toLocaleString('en-IN', currencyOptions)}`, pageWidth - margin, yPos, { align: 'right' });
            yPos += lineHeight;

            // Total
            doc.setFont(undefined, 'bold');
            doc.text(`Total:`, margin + 100, yPos, { align: 'right' });
            doc.text(`₹${total.toLocaleString('en-IN', currencyOptions)}`, pageWidth - margin, yPos, { align: 'right' });
            yPos += lineHeight;

            // Payment status
            doc.setFont(undefined, 'normal');
            doc.text(`Status: ${order.paymentStatus || 'Pending'}`, margin, yPos);
            yPos += lineHeight + 10;

            // Add separator between orders
if (index < orders.length - 1) {
                doc.setDrawColor(200);
                doc.setLineWidth(0.2);
                doc.line(margin, yPos, pageWidth - margin, yPos);
                doc.setDrawColor(0);
                yPos += 10;
            }
        });

        // Save the PDF with a timestamp in the filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        doc.save(`Order_History_${timestamp}.pdf`);
    }

    // Initialize export buttons
    function setupExportButtons() {
        // Handle CSV Export
        const csvBtn = document.getElementById('exportBtn');
        if (csvBtn) {
            csvBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleExport(csvBtn, exportData);
            });
        }

        // Handle PDF Export
        const pdfBtn = document.getElementById('exportPdfBtn');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                handleExport(pdfBtn, exportToPDF);
            });
        }
    }

    function initializeExportButtons() {
        console.log('Setting up export buttons...');
        
        // Setup CSV export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            console.log('Found CSV export button');
            exportBtn.addEventListener('click', () => handleExport(exportBtn, exportData));
        } else {
            console.warn('CSV export button not found');
        }
        
        // Setup PDF export button
        const exportPdfBtn = document.getElementById('exportPdfBtn');
        if (exportPdfBtn) {
            console.log('Found PDF export button');
            exportPdfBtn.addEventListener('click', () => handleExport(exportPdfBtn, exportToPDF));
        } else {
            console.warn('PDF export button not found');
        }
        
        console.log('Export buttons initialized');
    }
})();
