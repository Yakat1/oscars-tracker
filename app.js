// State
let allFilms = [];
let filteredFilms = [];
let currentPage = 1;
const itemsPerPage = 24;
let watchedFilms = new Set();

// DOM Elements
const filmList = document.getElementById('filmList');
const searchInput = document.getElementById('searchInput');
const yearFilter = document.getElementById('yearFilter');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');
const watchedCountEl = document.getElementById('watchedCount');
const totalCountEl = document.getElementById('totalCount');
const loader = document.getElementById('loader');
const randomPickerBtn = document.getElementById('randomPickerBtn');
const randomResult = document.getElementById('randomResult');

// Initialize
function init() {
    loader.style.display = 'block';
    
    // Load watched state from localStorage
    const savedWatched = localStorage.getItem('oscarWatchedFilms');
    if (savedWatched) {
        watchedFilms = new Set(JSON.parse(savedWatched));
    }

    // Use the data loaded from data.js
    if (typeof oscarData !== 'undefined') {
        allFilms = oscarData;
        
        // Extract unique years and categories for filters
        const years = new Set();
        const categories = new Set();
        
        allFilms.forEach(film => {
            film.years.forEach(y => years.add(y));
            film.nominations.forEach(n => categories.add(n.category));
        });
        
        populateFilters(Array.from(years).sort().reverse(), Array.from(categories).sort());
        
        applyFilters();
        loader.style.display = 'none';
    } else {
        filmList.innerHTML = '<p>Error: Data not loaded. Please ensure data parser script was run.</p>';
        loader.style.display = 'none';
    }

    // Event Listeners
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    yearFilter.addEventListener('change', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);
    
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderPage();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        const maxPage = Math.ceil(filteredFilms.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderPage();
        }
    });

    randomPickerBtn.addEventListener('click', pickRandomUnwatchedFilm);
}

function populateFilters(years, categories) {
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearFilter.appendChild(option);
    });
    
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        // Clean up category name for display
        option.textContent = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
        categoryFilter.appendChild(option);
    });
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedYear = yearFilter.value;
    const selectedCategory = categoryFilter.value;
    const selectedStatus = statusFilter.value;
    
    filteredFilms = allFilms.filter(film => {
        // Search matches title, or any nominee name
        const matchesSearch = searchTerm === '' || 
            film.title.toLowerCase().includes(searchTerm) ||
            film.nominations.some(n => n.nominee.toLowerCase().includes(searchTerm));
            
        // Year match
        const matchesYear = selectedYear === 'all' || film.years.includes(selectedYear);
        
        // Category match
        const matchesCategory = selectedCategory === 'all' || 
            film.nominations.some(n => n.category === selectedCategory);
            
        // Status match
        const isWatched = watchedFilms.has(film.title);
        const matchesStatus = selectedStatus === 'all' || 
            (selectedStatus === 'watched' && isWatched) ||
            (selectedStatus === 'unwatched' && !isWatched);
            
        return matchesSearch && matchesYear && matchesCategory && matchesStatus;
    });
    
    currentPage = 1;
    renderPage();
    updateStats();
}

function renderPage() {
    filmList.innerHTML = '';
    
    if (filteredFilms.length === 0) {
        filmList.innerHTML = '<p>No films found matching your criteria.</p>';
        pageInfo.textContent = 'Page 0 of 0';
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredFilms.length);
    const maxPage = Math.ceil(filteredFilms.length / itemsPerPage);
    
    const pageFilms = filteredFilms.slice(startIndex, endIndex);
    
    pageFilms.forEach(film => {
        const isWatched = watchedFilms.has(film.title);
        
        const card = document.createElement('div');
        card.className = `film-card ${isWatched ? 'watched' : ''}`;
        
        const showNoms = film.nominations.slice(0, 3);
        const extraNoms = film.nominations.slice(3);
        
        const formatNom = (n) => `
            <div class="nom-item ${n.winner ? 'winner-nom' : ''}">
                <span class="nom-category">${n.winner ? '⭐ ' : ''}${n.category} (${n.year})</span>
                ${n.nominee !== film.title ? n.nominee : ''}
                ${n.character ? '<span class="nom-detail">as ' + n.character + '</span>' : ''}
            </div>
        `;
        
        let nomsHtml = showNoms.map(formatNom).join('');
        
        if (extraNoms.length > 0) {
            nomsHtml += `
                <div class="expandable-noms">
                    <div class="nom-summary nom-detail">+ ${extraNoms.length} more nomination${extraNoms.length > 1 ? 's' : ''}</div>
                    <div class="extra-noms-list">
                        ${extraNoms.map(formatNom).join('')}
                    </div>
                </div>
            `;
        }

        const yearsStr = film.years.join(', ');
        
        card.innerHTML = `
            <div class="film-header">
                <h3 class="film-title">${film.title}</h3>
                <span class="film-years">${yearsStr}</span>
            </div>
            <div class="noms-list">
                ${nomsHtml}
            </div>
            <div class="card-actions">
                <label class="checkbox-container">
                    Watched
                    <input type="checkbox" class="watch-checkbox" data-title="${film.title}" ${isWatched ? 'checked' : ''}>
                    <span class="checkmark"></span>
                </label>
            </div>
        `;
        
        filmList.appendChild(card);
    });
    
    // Add event listeners to checkboxes
    document.querySelectorAll('.watch-checkbox').forEach(cb => {
        cb.addEventListener('change', handleWatchToggle);
    });
    
    // Update pagination UI
    pageInfo.textContent = `Page ${currentPage} of ${maxPage}`;
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === maxPage;
}

function handleWatchToggle(e) {
    const title = e.target.getAttribute('data-title');
    const isChecked = e.target.checked;
    const card = e.target.closest('.film-card');
    
    if (isChecked) {
        watchedFilms.add(title);
        card.classList.add('watched');
    } else {
        watchedFilms.delete(title);
        card.classList.remove('watched');
    }
    
    // Save to localStorage
    localStorage.setItem('oscarWatchedFilms', JSON.stringify(Array.from(watchedFilms)));
    updateStats();
    
    // If filtering by status, we might need to remove the card from view immediately
    if (statusFilter.value !== 'all') {
        // Option 1: Re-apply filters immediately (might be jarring if the list shifts)
        // applyFilters(); 
        
        // Option 2: Just hide the card to avoid full re-render
        card.style.display = 'none';
        // Minor visual bug: pagination count won't update until next filter/page change, 
        // but it's a smoother UX.
    }
}

function updateStats() {
    watchedCountEl.textContent = watchedFilms.size;
    totalCountEl.textContent = allFilms.length;
}

function pickRandomUnwatchedFilm() {
    // Clear the search input first so we don't just keep picking the result of a previous random pick
    searchInput.value = '';
    applyFilters();

    // Now pick from the currently filtered list (respecting year/category/status choices)
    const availableFilms = filteredFilms.filter(film => !watchedFilms.has(film.title));

    if (availableFilms.length === 0) {
        randomResult.style.display = 'block';
        randomResult.innerHTML = "You've watched all the films matching the current filters!";
        return;
    }

    const randomIndex = Math.floor(Math.random() * availableFilms.length);
    const chosenFilm = availableFilms[randomIndex];
    
    // Add brief animation effect
    randomResult.style.display = 'block';
    randomResult.innerHTML = `Picking...`;
    
    setTimeout(() => {
        randomResult.innerHTML = `Suggested Watch: <br><span class="highlight">${chosenFilm.title}</span> (${chosenFilm.years.join(', ')})`;
        
        // Optionally, reset search and search for this specific film to show it
        searchInput.value = chosenFilm.title;
        applyFilters();
    }, 600);
}

// Utility: Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Run init when DOM is ready
document.addEventListener('DOMContentLoaded', init);
