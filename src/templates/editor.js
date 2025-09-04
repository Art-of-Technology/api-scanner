class ApiEditor {
    constructor() {
        this.apiData = null;
        this.editingResponse = null;
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.renderEndpoints();
            this.setupEventListeners();
            this.hideLoading();
        } catch (error) {
            this.showError('Failed to load API data: ' + error.message);
        }
    }

    async loadData() {
        const response = await fetch('/api/data');
        if (!response.ok) {
            throw new Error('Failed to fetch data');
        }
        this.apiData = await response.json();
        console.log('Loaded API data:', this.apiData);
        console.log('First endpoint:', this.apiData?.endpoints?.[0]);
    }

    renderEndpoints() {
        const container = document.getElementById('endpoints-container');
        container.innerHTML = '';

        if (!this.apiData || !this.apiData.endpoints) {
            container.innerHTML = '<div class="text-center py-5"><p class="text-muted">No endpoints found</p></div>';
            return;
        }

        // Group endpoints by file
        const endpointsByFile = this.groupEndpointsByFile(this.apiData.endpoints);
        
        // Create file buttons
        const fileButtons = this.createFileButtons(endpointsByFile);
        container.innerHTML = fileButtons;

        // Add endpoint cards
        this.apiData.endpoints.forEach((endpoint, index) => {
            const endpointCard = this.createEndpointCard(endpoint, index);
            container.appendChild(endpointCard);
        });

        // Update statistics
        this.updateStatistics();
    }

    createEndpointCard(endpoint, index) {
        const card = document.createElement('div');
        card.className = 'endpoint-card';
        card.innerHTML = `
            <div class="endpoint-header">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <span class="method-badge method-${endpoint.method.toLowerCase()} me-2">
                            ${endpoint.method}
                        </span>
                        <span>${endpoint.url}</span>
                    </div>
                </div>
            </div>
            <div class="endpoint-body">
                <div class="mb-2">
                    <strong>@api {${endpoint.method.toLowerCase()}}${endpoint.url}</strong> ${endpoint.description || ''}
                </div>
                
                <!-- Responses Section -->
                <div class="mt-3">
                    <h6 class="mb-2">→ Responses</h6>
                    ${this.renderResponses(endpoint.responses || [], index)}
                </div>
                

            </div>
        `;

        return card;
    }

    renderResponses(responses, endpointIndex) {
        if (!responses || (Array.isArray(responses) && responses.length === 0) || (typeof responses === 'object' && Object.keys(responses).length === 0)) {
            return '<p class="text-muted small">No responses defined</p>';
        }

        // Handle both array format and object format from scanner
        let responsesArray = [];
        if (Array.isArray(responses)) {
            responsesArray = responses;
        } else if (typeof responses === 'object') {
            // Convert object format to array format
            responsesArray = Object.keys(responses).map(statusCode => ({
                statusCode: statusCode,
                description: responses[statusCode].description || '',
                example: responses[statusCode].example || {}
            }));
        }

        return responsesArray.map((response, responseIndex) => `
            <div class="response-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <span class="response-status">${response.statusCode} - ${response.description || 'Response'}</span>
                    </div>
                    <div>
                        <button class="edit-btn" 
                                data-endpoint-index="${endpointIndex}" 
                                data-response-index="${responseIndex}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                <div class="response-example clickable-response" 
                     id="response-${endpointIndex}-${responseIndex}"
                     data-endpoint-index="${endpointIndex}" 
                     data-response-index="${responseIndex}">
                    ${typeof response.example === 'object' ? JSON.stringify(response.example, null, 2) : (response.example || 'No example provided')}
                </div>
                <div class="d-none" id="editor-${endpointIndex}-${responseIndex}">
                    <textarea class="json-editor" rows="6">${typeof response.example === 'object' ? JSON.stringify(response.example, null, 2) : (response.example || '')}</textarea>
                    <div class="mt-2">
                        <button class="save-btn" 
                                data-endpoint-index="${endpointIndex}" 
                                data-response-index="${responseIndex}">
                            <i class="fas fa-save me-1"></i>Save
                        </button>
                        <button class="cancel-btn" 
                                data-endpoint-index="${endpointIndex}" 
                                data-response-index="${responseIndex}">
                            <i class="fas fa-times me-1"></i>Cancel
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Edit buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-btn')) {
                const btn = e.target.closest('.edit-btn');
                const endpointIndex = parseInt(btn.getAttribute('data-endpoint-index'));
                const responseIndex = parseInt(btn.getAttribute('data-response-index'));
                this.startEditing(endpointIndex, responseIndex);
            }
        });

        // Save buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.save-btn')) {
                const btn = e.target.closest('.save-btn');
                const endpointIndex = parseInt(btn.getAttribute('data-endpoint-index'));
                const responseIndex = parseInt(btn.getAttribute('data-response-index'));
                this.saveResponse(endpointIndex, responseIndex);
            }
        });

        // Cancel buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.cancel-btn')) {
                const btn = e.target.closest('.cancel-btn');
                const endpointIndex = parseInt(btn.getAttribute('data-endpoint-index'));
                const responseIndex = parseInt(btn.getAttribute('data-response-index'));
                this.cancelEditing(endpointIndex, responseIndex);
            }
        });



        // File buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.file-btn')) {
                const btn = e.target.closest('.file-btn');
                const firstEndpointIndex = btn.getAttribute('data-first-endpoint');
                this.scrollToEndpoint(firstEndpointIndex);
            }
        });

        // Clickable response examples
        document.addEventListener('click', (e) => {
            if (e.target.closest('.clickable-response')) {
                const responseDiv = e.target.closest('.clickable-response');
                const endpointIndex = parseInt(responseDiv.getAttribute('data-endpoint-index'));
                const responseIndex = parseInt(responseDiv.getAttribute('data-response-index'));
                this.startEditing(endpointIndex, responseIndex);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC key to cancel editing
            if (e.key === 'Escape' && this.editingResponse) {
                const { endpointIndex, responseIndex } = this.editingResponse;
                this.cancelEditing(endpointIndex, responseIndex);
            }
            
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's' && this.editingResponse) {
                e.preventDefault(); // Prevent browser save dialog
                const { endpointIndex, responseIndex } = this.editingResponse;
                this.saveResponse(endpointIndex, responseIndex);
            }
        });
    }

    startEditing(endpointIndex, responseIndex) {
        // Hide the display and show the editor
        const display = document.getElementById(`response-${endpointIndex}-${responseIndex}`);
        const editor = document.getElementById(`editor-${endpointIndex}-${responseIndex}`);
        
        if (display && editor) {
            display.classList.add('d-none');
            editor.classList.remove('d-none');
            
            // Set editing state
            this.editingResponse = { endpointIndex, responseIndex };
            
            // Focus the textarea
            const textarea = editor.querySelector('.json-editor');
            if (textarea) {
                textarea.focus();
            }
        }
    }

    cancelEditing(endpointIndex, responseIndex) {
        // Hide the editor and show the display
        const display = document.getElementById(`response-${endpointIndex}-${responseIndex}`);
        const editor = document.getElementById(`editor-${endpointIndex}-${responseIndex}`);
        
        if (display && editor) {
            editor.classList.add('d-none');
            display.classList.remove('d-none');
            
            // Clear editing state
            this.editingResponse = null;
        }
    }

    async saveResponse(endpointIndex, responseIndex) {
        try {
            const editor = document.getElementById(`editor-${endpointIndex}-${responseIndex}`);
            const textarea = editor.querySelector('.json-editor');
            let newExample = textarea.value;

            console.log('Saving response:', { endpointIndex, responseIndex, newExample });

            // Try to parse as JSON if it looks like JSON
            try {
                if (newExample.trim().startsWith('{') || newExample.trim().startsWith('[')) {
                    newExample = JSON.parse(newExample);
                }
            } catch (e) {
                // Keep as string if not valid JSON
            }

            // Update the data - handle both array and object formats
            const endpoint = this.apiData.endpoints[endpointIndex];
            console.log('Current endpoint:', endpoint);
            
            if (Array.isArray(endpoint.responses)) {
                endpoint.responses[responseIndex].example = newExample;
            } else if (typeof endpoint.responses === 'object') {
                // Find the response by status code
                const statusCodes = Object.keys(endpoint.responses);
                const statusCode = statusCodes[responseIndex];
                if (statusCode) {
                    endpoint.responses[statusCode].example = newExample;
                }
            }

            console.log('Updated endpoint:', endpoint);

            // Save to server
            const response = await fetch(`/api/endpoint/${endpointIndex}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(endpoint)
            });

            console.log('Server response:', response.status, response.statusText);

            if (response.ok) {
                // Update the display
                const display = document.getElementById(`response-${endpointIndex}-${responseIndex}`);
                display.textContent = typeof newExample === 'object' ? JSON.stringify(newExample, null, 2) : (newExample || 'No example provided');
                
                // Hide editor and show display
                this.cancelEditing(endpointIndex, responseIndex);
                
                this.showToast('Response saved successfully!', 'success');
            } else {
                const errorText = await response.text();
                console.error('Server error:', errorText);
                throw new Error('Failed to save response: ' + errorText);
            }
        } catch (error) {
            console.error('Save error:', error);
            this.showToast('Failed to save response: ' + error.message, 'error');
        }
    }

    hideLoading() {
        document.getElementById('loading-state').classList.add('d-none');
        document.getElementById('endpoints-container').classList.remove('d-none');
        document.getElementById('stats-container').style.display = 'block';
    }

    updateStatistics() {
        if (!this.apiData) return;

        // Update total endpoints
        document.getElementById('total-endpoints').textContent = this.apiData.endpoints.length;

        // Update total categories
        const categories = new Set();
        this.apiData.endpoints.forEach(endpoint => {
            const urlPath = endpoint.url || '';
            const category = urlPath.split('/')[2] || 'api';
            categories.add(category);
        });
        document.getElementById('total-categories').textContent = categories.size;

        // Update version
        if (this.apiData.info && this.apiData.info.version) {
            document.getElementById('api-version').textContent = `v${this.apiData.info.version}`;
        }

        // Update generated date
        const today = new Date();
        const dateString = `${today.getMonth() + 1}/${today.getDate()}/${today.getFullYear()}`;
        document.getElementById('generated-date').textContent = dateString;
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastBody = toast.querySelector('.toast-body');
        const toastHeader = toast.querySelector('.toast-header');
        
        toastBody.textContent = message;
        
        // Update icon and color based on type
        const icon = toastHeader.querySelector('i');
        icon.className = type === 'success' ? 'fas fa-check-circle text-success me-2' :
                        type === 'error' ? 'fas fa-exclamation-circle text-danger me-2' :
                        'fas fa-info-circle text-info me-2';
        
        const bsToast = new bootstrap.Toast(toast);
        bsToast.show();
    }

    showError(message) {
        document.getElementById('loading-state').innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle text-danger fa-3x mb-3"></i>
                <h5 class="text-danger">Error</h5>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary" onclick="location.reload()">
                    <i class="fas fa-refresh me-1"></i>
                    Retry
                </button>
            </div>
        `;
    }



    groupEndpointsByFile(endpoints) {
        const grouped = {};
        endpoints.forEach((endpoint, index) => {
            // Extract category from URL path (e.g., /api/users -> users)
            const urlPath = endpoint.url || '';
            const category = urlPath.split('/')[2] || 'api'; // Get the category part
            
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push({ endpoint, index });
        });
        return grouped;
    }

    createFileButtons(endpointsByFile) {
        const categories = Object.keys(endpointsByFile);
        console.log('Categories found:', categories);
        console.log('Endpoints by category:', endpointsByFile);
        if (categories.length <= 1) return '';

        const buttons = categories.map(category => {
            const endpointCount = endpointsByFile[category].length;
            const firstEndpointIndex = endpointsByFile[category][0].index;
            
            return `
                <li>
                    <a href="#" class="file-btn" 
                       data-category="${category}" 
                       data-first-endpoint="${firstEndpointIndex}">
                        ${category}
                    </a>
                </li>
            `;
        }).join('');

        return `
            <div class="file-buttons-container">
                <h6>
                    <i class="fas fa-list-ul me-2"></i>
                    Table of Contents
                </h6>
                <ul class="file-buttons">
                    ${buttons}
                </ul>
            </div>
        `;
    }

    scrollToEndpoint(endpointIndex) {
        const endpointCards = document.querySelectorAll('.endpoint-card');
        if (endpointCards[endpointIndex]) {
            endpointCards[endpointIndex].scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
            
            // Highlight the endpoint briefly
            endpointCards[endpointIndex].style.border = '2px solid var(--accent-blue)';
            setTimeout(() => {
                endpointCards[endpointIndex].style.border = '';
            }, 2000);
        }
    }
}

// Global function for scroll to top
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Initialize editor when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ApiEditor();
});
