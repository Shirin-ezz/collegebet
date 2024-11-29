document.addEventListener('DOMContentLoaded', function() {
    // Initialize search form handler
    const searchForm = document.getElementById('teamSearchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }

    // Initialize Feather icons
    feather.replace();
});

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function isLoggedIn() {
    // Check for profile/logout links in the navigation
    const navbarNav = document.querySelector('#navbarNav');
    const profileLink = navbarNav ? navbarNav.querySelector('a[href="/profile.php"]') : null;
    const logoutLink = navbarNav ? navbarNav.querySelector('a[href="/logout.php"]') : null;
    
    // Add detailed logging
    console.log('Navigation elements:', {
        navFound: navbarNav !== null,
        profileLink: profileLink !== null,
        logoutLink: logoutLink !== null
    });
    
    // If either link exists, user is logged in
    return profileLink !== null || logoutLink !== null;
}

async function handleSearch(e) {
    e.preventDefault();
    const searchInput = document.getElementById('teamSearchInput');
    const resultsContainer = document.getElementById('resultsContainer');
    
    try {
        if (!searchInput.value.trim()) {
            showError('Please enter a team name to search');
            return;
        }

        const searchTerm = searchInput.value.trim();
const response = await fetch(`/api_handler.php?team=${encodeURIComponent(searchTerm)}`);
        if (!response.ok) {
            const errorMessage = `Failed to fetch data: ${response.status} ${response.statusText}`;
            console.error(errorMessage);
            throw new Error(errorMessage);
        }

        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            throw new Error('Invalid response format from server');
        }
        
        if (data.error) {
            console.error('API Error:', data.error);
            showError(data.error);
            return;
        }
        
        if (!data.team) {
            showError('No team found matching your search criteria');
            return;
        }
        
        displayResults(data);
    } catch (error) {
        console.error('Search Error:', {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
        showError(error.message || 'An unexpected error occurred while searching. Please try again.');
    }
}

function displayResults(data) {
    console.log('Received team data:', data);
    const resultsContainer = document.getElementById('resultsContainer');
    const team = data.team;
    
    if (!team) {
        console.log('No team data found in response');
        resultsContainer.innerHTML = '<div class="alert alert-info">No results found</div>';
        return;
    }
    
    console.log('Displaying team:', team.name);

    const isUserLoggedIn = isLoggedIn();
    console.log('User logged in status:', isUserLoggedIn);

    const favoriteButton = isUserLoggedIn ? `
    <div class="favorite-button-wrapper">
        <button class="btn btn-outline-primary favorite-btn" 
                data-team-id="${team.id}" 
                onclick="handleFavoriteClick(event)"
                style="display: inline-flex !important;">
            <i class="feather-heart"></i>
            <span style="margin-left: 0.5rem;">Add to Favorites</span>
        </button>
    </div>
` : '';

// Add debug logging
console.log('Favorite button rendering:', {
    isUserLoggedIn,
    buttonHtml: favoriteButton
});

    resultsContainer.innerHTML = `
        <div class="card mb-4">
            <div class="card-body">
                <div class="row align-items-start">
                    <div class="col-md-8">
                        <h2>${team.name}</h2>
                        <div class="team-stats">
                            <span class="badge bg-primary me-2">Rank #${team.current_ranking}</span>
                            <span class="badge bg-secondary me-2">${team.conference}</span>
                            <span class="badge bg-info">${team.season_record}</span>
                        </div>
                    </div>
                    <div class="col-md-4 text-md-end">
                        ${favoriteButton}
                    </div>
                </div>
            </div>
            
            <div class="card-body border-top">
                <h3>Upcoming Matchups</h3>
                <div class="table-responsive">
                    ${displayUpcomingMatchups(data.upcoming)}
                </div>
            </div>
            
            <div class="card-body border-top">
                <h3>Historical Matchups</h3>
                <div class="table-responsive">
                    ${displayHistoricalMatchups(data.historical)}
                </div>
            </div>
        </div>
    `;

    // Add console logs for debugging
    console.log('Login status:', isLoggedIn());
    console.log('Favorite button HTML:', favoriteButton);

    // Re-initialize Feather icons for newly added content
    feather.replace();
    
    // Add event listener for favorite button if logged in
    const favoriteBtn = resultsContainer.querySelector('.favorite-btn');
    if (favoriteBtn) {
        favoriteBtn.addEventListener('click', handleFavoriteClick);
    }
}

function displayUpcomingMatchups(matchups) {
    if (!matchups || matchups.length === 0) {
        return '<p class="text-muted">No upcoming matchups scheduled</p>';
    }

    return `
        <table class="table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Spread</th>
                    <th>Moneyline</th>
                    <th>Over/Under</th>
                </tr>
            </thead>
            <tbody>
                ${matchups.map(game => `
                    <tr>
                        <td>${formatDate(game.game_date)}</td>
                        <td>${game.opponent}</td>
                        <td>${game.spread}</td>
                        <td>${game.moneyline}</td>
                        <td>${game.over_under}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function displayHistoricalMatchups(matchups) {
    if (!matchups || matchups.length === 0) {
        return '<p class="text-muted">No historical matchups available</p>';
    }

    return `
        <table class="table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Opponent</th>
                    <th>Result</th>
                    <th>Score</th>
                    <th>Spread</th>
                </tr>
            </thead>
            <tbody>
                ${matchups.map(game => `
                    <tr>
                        <td>${formatDate(game.game_date)}</td>
                        <td>${game.opponent}</td>
                        <td>${game.result}</td>
                        <td>${game.score}</td>
                        <td>${game.spread}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function handleFavoriteClick(event) {
    const btn = event.currentTarget;
    const teamId = btn.dataset.teamId;
    const isCurrentlyFavorite = btn.classList.contains('btn-primary');
    
    try {
        const method = isCurrentlyFavorite ? 'DELETE' : 'POST';
        const url = isCurrentlyFavorite ? 
            `/favorites_handler.php?team_id=${teamId}` :
            '/favorites_handler.php';
            
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        };
        
        if (!isCurrentlyFavorite) {
            options.body = `team_id=${teamId}`;
        }
        
        const response = await fetch(url, options);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        
        // Update button state
        btn.classList.toggle('btn-outline-primary');
        btn.classList.toggle('btn-primary');
        const span = btn.querySelector('span');
        span.textContent = isCurrentlyFavorite ? 'Add to Favorites' : 'Remove from Favorites';
        
    } catch (error) {
        console.error('Favorite operation error:', error);
        showError(error.message || 'Failed to update favorite status');
    }
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger alert-dismissible fade show';
    errorDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    const container = document.getElementById('resultsContainer') || document.querySelector('main');
    container.insertBefore(errorDiv, container.firstChild);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}
