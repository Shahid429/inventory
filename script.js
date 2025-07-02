// Application State
let allProducts = [];
let filteredProducts = [];
let currentFilter = 'all';
let currentSort = 'name';
let isLoading = false;

// API Configuration
const API_URL = 'https://script.google.com/macros/s/AKfycbwt4AroNuGs2gBbI0cgSuFpMExjIfEpnyi1QYRKY9vWWFkv29weCL9z7dTMpyGQbDOusw/exec';

// Cache for better performance
let apiCache = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let cacheTimestamp = 0;

// Fetch products from API with caching
async function fetchProducts() {
    const now = Date.now();
    // Use cache if available and not expired
    if (apiCache && (now - cacheTimestamp) < CACHE_DURATION) {
        allProducts = apiCache;
        processProducts();
        return;
    }
    try {
        showLoading();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        const response = await fetch(API_URL, {
            signal: controller.signal,
            cache: 'no-cache'
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Cache the data
        apiCache = data;
        cacheTimestamp = now;
        allProducts = data;
        processProducts();
    } catch (error) {
        console.error('Error fetching products:', error);
        showError();
    }
}

// Process and display products
function processProducts() {
    filteredProducts = [...allProducts];
    applyFilters();
    updateStats();
    hideLoading();
}

// Apply current filters and sorting
function applyFilters() {
    let products = [...allProducts];
    // Apply search filter
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    if (searchTerm) {
        products = products.filter(product => {
            const name = (product['Name of item '] || '').toLowerCase();
            const partNumber = String(product['Part or Item Number'] || '').toLowerCase();
            return name.includes(searchTerm) || partNumber.includes(searchTerm);
        });
    }
    // Apply status filter
    if (currentFilter !== 'all') {
        products = products.filter(product => {
            const status = product['Stock Status'] || '';
            const stock = parseInt(product['Current Stock']) || 0;
            switch (currentFilter) {
                case 'in-stock':
                    return status === 'In Stock';
                case 'out-of-stock':
                    return status === 'Out of Stock';
                case 'low-stock':
                    return status === 'In Stock' && stock > 0 && stock <= 10;
                default:
                    return true;
            }
        });
    }
    // Apply sorting
    products.sort((a, b) => {
        switch (currentSort) {
            case 'name':
                return (a['Name of item '] || '').localeCompare(b['Name of item '] || '');
            case 'price-low':
                return (parseFloat(a['Price Per Unit']) || 0) - (parseFloat(b['Price Per Unit']) || 0);
            case 'price-high':
                return (parseFloat(b['Price Per Unit']) || 0) - (parseFloat(a['Price Per Unit']) || 0);
            case 'stock':
                return (parseInt(b['Current Stock']) || 0) - (parseInt(a['Current Stock']) || 0);
            default:
                return 0;
        }
    });
    filteredProducts = products;
    displayProducts();
}

// Display products with enhanced cards
function displayProducts() {
    const grid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');
    resultsCount.textContent = `Showing ${filteredProducts.length} of ${allProducts.length} products`;
    if (filteredProducts.length === 0) {
        grid.innerHTML = '';
        noResults.classList.remove('hidden');
        return;
    }
    noResults.classList.add('hidden');
    grid.innerHTML = filteredProducts.map((product, index) => {
        const partNumber = product['Part or Item Number'] || 'N/A';
        const name = (product['Name of item '] || 'Unknown Product').trim();
        const imgUrl = product['Img url of item'] || '';
        const stock = parseInt(product['Current Stock']) || 0;
        const price = parseFloat(product['Price Per Unit']) || 0;
        const stockStatus = product['Stock Status'] || 'Unknown';
        const lastOrderDate = product['Last Order Date'] || '';
        const isInStock = stockStatus === 'In Stock';
        const isLowStock = isInStock && stock > 0 && stock <= 10;
        const stockBadgeClass = !isInStock ? 'bg-red-500' : isLowStock ? 'bg-yellow-500' : 'bg-green-500';
        const stockIcon = !isInStock ? 'fa-times-circle' : isLowStock ? 'fa-exclamation-triangle' : 'fa-check-circle';
        const stockText = !isInStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock';
        // Format last order date
        let formattedDate = '';
        if (lastOrderDate) {
            try {
                formattedDate = new Date(lastOrderDate).toLocaleDateString('en-IN');
            } catch (e) {
                formattedDate = '';
            }
        }
        // WhatsApp message with more details
        const whatsappMessage = `🛠️ *Product Inquiry - Modern Ply Gallery*\n\n📦 *Product:* ${name}\n🔢 *Part Number:* ${partNumber}\n💰 *Price:* ${price ? `₹${price.toLocaleString('en-IN')}` : 'Please contact for price'}\n📊 *Stock:* ${stock ? `${stock} units available` : 'Please check availability'}\n📋 *Status:* ${stockText}\n${formattedDate ? `📅 *Last Restocked:* ${formattedDate}` : ''}\n\nCould you please provide more details and confirm availability?\n\nThank you! 🙏`;
        const whatsappUrl = `https://wa.me/919876543210?text=${encodeURIComponent(whatsappMessage)}`;
        return `
            <div class="bg-gray-800 rounded-2xl shadow-lg overflow-hidden card-hover interactive-border fade-in-up" style="animation-delay: ${index * 0.1}s">
                <!-- Product Image -->
                <div class="h-48 sm:h-56 bg-gradient-to-br from-gray-700 to-gray-600 relative overflow-hidden flex items-center justify-center">
                    ${imgUrl && imgUrl.trim() && imgUrl !== 'N/A' ?
                        `<img src="${imgUrl}" alt="${name}" class="w-full h-full object-cover transition-transform duration-300 hover:scale-110" loading="lazy" onerror="this.style.display='none';this.parentElement.innerHTML='<div class=\'flex items-center justify-center h-full\'><i class=\'fas fa-tools text-6xl text-gray-300\'></i></div>';">`
                        : `<div class='flex items-center justify-center h-full'><i class='fas fa-tools text-6xl text-gray-300'></i></div>`
                    }
                    <span class="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold text-white ${stockBadgeClass}">
                        <i class="fas ${stockIcon} mr-1"></i>${stockText}
                    </span>
                </div>
                <!-- Product Details -->
                <div class="p-6 flex flex-col gap-2">
                    <h3 class="text-lg font-bold text-gray-200 mb-1 truncate" title="${name}">${name}</h3>
                    <div class="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <span class="bg-gray-700 px-2 py-1 rounded">Part #: ${partNumber}</span>
                        ${formattedDate ? `<span class="bg-blue-50 text-blue-600 px-2 py-1 rounded"><i class='fas fa-calendar-alt mr-1'></i>${formattedDate}</span>` : ''}
                    </div>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-xl font-bold price-highlight">${price ? `₹${price.toLocaleString('en-IN')}` : 'Contact for Price'}</span>
                        <span class="text-xs text-gray-400">/unit</span>
                    </div>
                    <div class="flex items-center gap-2 mb-4">
                        <span class="text-sm text-gray-300 font-medium"><i class="fas fa-box mr-1"></i>${stock} in stock</span>
                    </div>
                    <a href="${whatsappUrl}" target="_blank" class="mt-auto bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-semibold px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md w-full">
                        <i class="fab fa-whatsapp"></i>Enquire on WhatsApp
                    </a>
                </div>
            </div>
        `;
    }).join('');
}

// Show loading spinner and hide other sections
function showLoading() {
    isLoading = true;
    document.getElementById('loadingSection').classList.remove('hidden');
    document.getElementById('productsSection').classList.add('hidden');
    document.getElementById('noResults').classList.add('hidden');
    document.getElementById('errorSection').classList.add('hidden');
}

// Hide loading spinner and show products section
function hideLoading() {
    isLoading = false;
    document.getElementById('loadingSection').classList.add('hidden');
    document.getElementById('productsSection').classList.remove('hidden');
}

// Show error section
function showError() {
    hideLoading();
    document.getElementById('errorSection').classList.remove('hidden');
}

// Update stats counters
function updateStats() {
    const total = allProducts.length;
    const inStock = allProducts.filter(p => p['Stock Status'] === 'In Stock').length;
    const outOfStock = allProducts.filter(p => p['Stock Status'] === 'Out of Stock').length;
    const lowStock = allProducts.filter(p => p['Stock Status'] === 'In Stock' && parseInt(p['Current Stock']) <= 10).length;
    document.getElementById('totalProducts').textContent = total;
    document.getElementById('inStockProducts').textContent = inStock;
    document.getElementById('categories').textContent = `${new Set(allProducts.map(p => p['Category'])).size}+`;
}

// Event Listeners
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('sortSelect').addEventListener('change', function() {
    currentSort = this.value;
    applyFilters();
});
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active', 'bg-purple-600', 'text-white'));
        this.classList.add('active', 'bg-purple-600', 'text-white');
        currentFilter = this.getAttribute('data-filter');
        applyFilters();
    });
});
// Fix Reset Filters button style and UI
// Add a spinner to the button when clicked, and disable it during loading
const resetBtn = document.getElementById('resetFilters');
if (resetBtn) {
    resetBtn.addEventListener('click', function() {
        resetBtn.disabled = true;
        resetBtn.innerHTML = '<span class="animate-spin mr-2"><i class="fas fa-sync-alt"></i></span>Resetting...';
        setTimeout(() => {
            document.getElementById('searchInput').value = '';
            document.getElementById('sortSelect').value = 'name';
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active', 'bg-purple-600', 'text-white'));
            document.querySelector('.filter-btn[data-filter="all"]').classList.add('active', 'bg-purple-600', 'text-white');
            currentFilter = 'all';
            currentSort = 'name';
            applyFilters();
            resetBtn.disabled = false;
            resetBtn.innerHTML = '<i class="fas fa-refresh mr-2"></i>Reset Filters';
        }, 500);
    });
}
document.getElementById('retryBtn').addEventListener('click', fetchProducts);

// Initial fetch
fetchProducts();
