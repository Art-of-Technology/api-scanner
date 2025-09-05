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
        console.log('Endpoints:', this.apiData?.endpoints);
        if (this.apiData?.endpoints) {
            console.log('First endpoint:', this.apiData.endpoints[0]);
        }
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
        
        // Render TOC in the sidebar
        this.renderTOC(endpointsByFile);
        
        // Create layout with sidebar and main content
        container.innerHTML = `
            <div class="row">
                <div class="col-lg-1 col-md-2">
                    <!-- TOC will be populated by JavaScript -->
                </div>
                <div class="col-lg-16 col-md-16">
                    <div id="endpoints-content">
                        <!-- Endpoints will be added here -->
                    </div>
                </div>
            </div>
        `;

        // Don't render all endpoints initially - only show when selected
        const contentArea = document.getElementById('endpoints-content');
        contentArea.innerHTML = '<div class="search-results text-center py-5"><p class="text-muted">Select an endpoint from the sidebar to view details</p></div>';

        // Update statistics
        this.updateStatistics();
        
        // Setup search functionality
        this.setupSearch();
    }

    renderTOC(endpointsByFile) {
        const tocContainer = document.getElementById('toc-list');
        if (!tocContainer) return;

        console.log('renderTOC called with:', endpointsByFile);

        // endpointsByFile is already grouped by category
        const categories = {};
        Object.keys(endpointsByFile).forEach(category => {
            const endpoints = endpointsByFile[category];
            console.log('Processing category:', category, 'endpoints:', endpoints);
            
            categories[category] = [];
            
            endpoints.forEach(endpointData => {
                console.log('Processing endpoint:', endpointData);
                const endpoint = endpointData.endpoint || endpointData;
                categories[category].push({
                    ...endpoint,
                    filePath: category,
                    index: endpointData.index
                });
            });
        });

        let tocHTML = '';
        Object.keys(categories).forEach(category => {
            const categoryEndpoints = categories[category];
            tocHTML += `
                <li class="toc-folder">
                    <div class="toc-folder-header" onclick="editor.toggleFolder('${category}')">
                        <i class="bi bi-folder me-2"></i>
                        <i class="bi bi-chevron-right folder-arrow" id="arrow-${category}"></i>
                        <span>${category}</span>
                        <span class="badge bg-secondary ms-2">${categoryEndpoints.length}</span>
                    </div>
                    <ul class="toc-endpoints d-none" id="folder-${category}">
                        ${categoryEndpoints.map(endpoint => `
                            <li>
                                <a href="javascript:void(0)" onclick="editor.showEndpoint('${endpoint.filePath}', ${endpoint.index})" class="toc-endpoint">
                                    <span class="method-badge method-${endpoint.method.toLowerCase()}">${endpoint.method}</span>
                                    <span class="endpoint-name">${this.getEndpointDisplayName(endpoint)}</span>
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </li>
            `;
        });

        tocContainer.innerHTML = tocHTML;
    }

    getCategoryFromPath(filePath) {
        // Extract category from path like "test-api\\src\\app\\api\\users\\route.ts" -> "users"
        console.log('getCategoryFromPath input:', filePath);
        const pathParts = filePath.split(/[/\\]/);
        console.log('pathParts:', pathParts);
        const apiIndex = pathParts.indexOf('api');
        console.log('apiIndex:', apiIndex);
        const category = apiIndex !== -1 && apiIndex + 1 < pathParts.length 
            ? pathParts[apiIndex + 1] 
            : 'api';
        console.log('category result:', category);
        return category;
    }

    getEndpointDisplayName(endpoint) {
        // Create display name from URL like "/api/users" -> "Get Users"
        const url = endpoint.url || '';
        const method = endpoint.method || 'GET';
        const path = url.replace('/api/', '').replace(/^\//, '');
        const action = method === 'GET' ? 'Get' : 
                     method === 'POST' ? 'Create' : 
                     method === 'PUT' ? 'Update' : 
                     method === 'DELETE' ? 'Delete' : method;
        
        // Safe string manipulation
        const displayPath = path && path.length > 0 
            ? path.charAt(0).toUpperCase() + path.slice(1)
            : 'Endpoint';
        
        return `${action} ${displayPath}`;
    }

    toggleFolder(category) {
        const folder = document.getElementById(`folder-${category}`);
        const arrow = document.getElementById(`arrow-${category}`);
        
        if (folder.classList.contains('d-none')) {
            folder.classList.remove('d-none');
            arrow.classList.remove('bi-chevron-right');
            arrow.classList.add('bi-chevron-down');
        } else {
            folder.classList.add('d-none');
            arrow.classList.remove('bi-chevron-down');
            arrow.classList.add('bi-chevron-right');
        }
    }

    showEndpoint(filePath, endpointIndex) {
        console.log('showEndpoint called with filePath:', filePath, 'endpointIndex:', endpointIndex);
        console.log('Available endpoints:', this.apiData.endpoints);
        
        // Find the endpoint by array index
        const endpoint = this.apiData.endpoints[endpointIndex];
        console.log('Found endpoint:', endpoint);
        
        if (!endpoint) {
            console.log('Endpoint not found!');
            return;
        }

        // Clear current content and show only this endpoint
        const container = document.getElementById('endpoints-content');
        container.innerHTML = '';
        
        const endpointCard = this.createEndpointCard(endpoint, endpointIndex);
        container.appendChild(endpointCard);
        console.log('Endpoint card added to container');
    }

    showEndpointFromSearch(endpointIndex) {
        console.log('showEndpointFromSearch called with index:', endpointIndex);
        
        // Find the endpoint by array index
        const endpoint = this.apiData.endpoints[endpointIndex];
        console.log('Found endpoint:', endpoint);
        
        if (!endpoint) {
            console.log('Endpoint not found!');
            return;
        }

        // Clear current content and show only this endpoint
        const container = document.getElementById('endpoints-content');
        container.innerHTML = '';
        
        const endpointCard = this.createEndpointCard(endpoint, endpointIndex);
        container.appendChild(endpointCard);
        console.log('Endpoint card added to container from search');
    }

    setupSearch() {
        const searchInput = document.getElementById('searchInput');
        const clearBtn = document.getElementById('clearSearchBtn');
        const searchBtn = document.getElementById('searchBtn');
        
        if (!searchInput) return;

        // Input event listener
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            this.searchEndpoints(query);
            this.toggleClearButton(query);
        });

        // Enter key listener
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = e.target.value.toLowerCase().trim();
                this.searchEndpoints(query);
            }
        });

        // Clear button listener
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                searchInput.value = '';
                this.searchEndpoints('');
                this.toggleClearButton('');
                searchInput.focus();
            });
        }

        // Search button listener
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                const query = searchInput.value.toLowerCase().trim();
                this.searchEndpoints(query);
            });
        }
    }

    toggleClearButton(query) {
        const clearBtn = document.getElementById('clearSearchBtn');
        if (clearBtn) {
            clearBtn.style.display = query ? 'block' : 'none';
        }
    }

    searchEndpoints(query) {
        if (!query) {
            // If search is empty, show all categories
            this.renderTOC(this.groupEndpointsByFile(this.apiData.endpoints));
            return;
        }

        // Filter endpoints based on search query
        const filteredEndpoints = this.apiData.endpoints.filter(endpoint => {
            const url = (endpoint.url || '').toLowerCase();
            const method = (endpoint.method || '').toLowerCase();
            const description = (endpoint.description || '').toLowerCase();
            const file = (endpoint.file || '').toLowerCase();
            
            return url.includes(query) || 
                   method.includes(query) || 
                   description.includes(query) || 
                   file.includes(query);
        });

        // Group filtered endpoints by category
        const filteredByFile = this.groupEndpointsByFile(filteredEndpoints);
        
        // Update TOC with filtered results
        this.renderTOC(filteredByFile);
        
        // Show search results with preview cards
        this.showSearchResults(filteredEndpoints.length, query, filteredEndpoints);
    }

    showSearchResults(count, query, filteredEndpoints = []) {
        const container = document.getElementById('endpoints-content');
        if (count === 0) {
            container.innerHTML = `
                <div class="search-results text-center py-5">
                    <i class="bi bi-search text-muted" style="font-size: 3rem;"></i>
                    <h5 class="text-muted mt-3">No results found</h5>
                    <p class="text-muted">No endpoints match "${query}"</p>
                </div>
            `;
        } else {
            const previewCards = filteredEndpoints.map((endpoint, index) => {
                // Find the original index in the main endpoints array
                const originalIndex = this.apiData.endpoints.findIndex(ep => 
                    ep.url === endpoint.url && ep.method === endpoint.method
                );
                
                return `
                    <div class="search-preview-card" onclick="editor.showEndpointFromSearch(${originalIndex})">
                        <div class="d-flex justify-content-between align-items-start">
                            <div class="flex-grow-1">
                                <div class="d-flex align-items-center mb-2">
                                    <span class="method-badge method-${(endpoint.method || 'GET').toLowerCase()} me-2">${endpoint.method || 'GET'}</span>
                                    <span class="endpoint-url">${endpoint.url || ''}</span>
                                </div>
                                <p class="endpoint-description mb-2">${endpoint.description || 'No description available'}</p>
                                <small class="text-muted">File: ${(endpoint.file || '').split(/[/\\]/).pop()}</small>
                            </div>
                            <button class="btn btn-sm btn-outline-primary" onclick="event.stopPropagation(); editor.showEndpointFromSearch(${originalIndex})">
                                <i class="bi bi-eye me-1"></i>View Details
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div class="search-results">
                    <div class="text-center py-3 mb-3">
                        <p class="text-muted">Found ${count} endpoint${count > 1 ? 's' : ''} matching "${query}"</p>
                    </div>
                    <div class="search-preview-grid">
                        ${previewCards}
                    </div>
                </div>
            `;
        }
    }

    createEndpointCard(endpoint, index) {
        const card = document.createElement('div');
        card.className = 'endpoint-card';
        card.innerHTML = `
            <div class="endpoint-header">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <span class="method-badge method-${(endpoint.method || 'GET').toLowerCase()} me-2">
                            ${endpoint.method || 'GET'}
                        </span>
                        <span>${endpoint.url}</span>
                    </div>
                </div>
            </div>
            <div class="endpoint-body">
                <div class="mb-2">
                    <strong>@api {${endpoint.method.toLowerCase()}}${endpoint.url}</strong> ${endpoint.description || ''}
                </div>
                
                <!-- Request Headers Section -->
                ${endpoint.requestHeaders && endpoint.requestHeaders.length > 0 ? `
                <div class="mt-3">
                    <h6 class="mb-2">→ Request Headers</h6>
                    ${this.renderRequestHeaders(endpoint.requestHeaders, index)}
                </div>
                ` : ''}
                
                <!-- Request Body Section -->
                ${endpoint.requestBody ? `
                <div class="mt-3">
                    <h6 class="mb-2">→ Request Body</h6>
                    ${this.renderRequestBody(endpoint.requestBody, index)}
                </div>
                ` : ''}
                
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

    renderRequestHeaders(headers, endpointIndex) {
        if (!headers || headers.length === 0) {
            return '<p class="text-muted small">No request headers defined</p>';
        }

        return headers.map((header, headerIndex) => `
            <div class="response-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <span class="response-status">${header.name}</span>
                        ${header.required ? '<span class="badge bg-danger ms-2">Required</span>' : '<span class="badge bg-secondary ms-2">Optional</span>'}
                    </div>
                    <div>
                        <button class="edit-btn" 
                                data-endpoint-index="${endpointIndex}" 
                                data-header-index="${headerIndex}">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                <div class="response-example clickable-response" 
                     id="header-${endpointIndex}-${headerIndex}"
                     data-endpoint-index="${endpointIndex}" 
                     data-header-index="${headerIndex}">
                    ${header.description || 'No description available'}
                </div>
                <div class="d-none" id="editor-header-${endpointIndex}-${headerIndex}">
                    <textarea class="json-editor" rows="3">${header.description || ''}</textarea>
                    <div class="mt-2">
                        <button class="save-btn" 
                                data-endpoint-index="${endpointIndex}" 
                                data-header-index="${headerIndex}">
                            <i class="fas fa-save me-1"></i>Save
                        </button>
                        <button class="cancel-btn" 
                                data-endpoint-index="${endpointIndex}" 
                                data-header-index="${headerIndex}">
                            <i class="fas fa-times me-1"></i>Cancel
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }

    renderRequestBody(requestBody, endpointIndex) {
        if (!requestBody) {
            return '<p class="text-muted small">No request body defined</p>';
        }

        return `
            <div class="response-item">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div>
                        <span class="response-status">${requestBody.type || 'application/json'}</span>
                    </div>
                    <div>
                        <button class="edit-btn" 
                                data-endpoint-index="${endpointIndex}" 
                                data-body-index="0">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </div>
                <div class="response-example clickable-response" 
                     id="body-${endpointIndex}-0"
                     data-endpoint-index="${endpointIndex}" 
                     data-body-index="0">
                    ${requestBody.description || 'Request body for this endpoint'}
                </div>
                ${requestBody.example ? `
                <div class="mt-2">
                    <strong>Example:</strong>
                    <div class="response-example mt-1">
                        ${typeof requestBody.example === 'object' ? JSON.stringify(requestBody.example, null, 2) : requestBody.example}
                    </div>
                </div>
                ` : ''}
                <div class="d-none" id="editor-body-${endpointIndex}-0">
                    <textarea class="json-editor" rows="6">${requestBody.description || ''}</textarea>
                    <div class="mt-2">
                        <button class="save-btn" 
                                data-endpoint-index="${endpointIndex}" 
                                data-body-index="0">
                            <i class="fas fa-save me-1"></i>Save
                        </button>
                        <button class="cancel-btn" 
                                data-endpoint-index="${endpointIndex}" 
                                data-body-index="0">
                            <i class="fas fa-times me-1"></i>Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Edit buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-btn')) {
                const btn = e.target.closest('.edit-btn');
                const endpointIndex = parseInt(btn.getAttribute('data-endpoint-index'));
                const responseIndex = btn.getAttribute('data-response-index');
                const headerIndex = btn.getAttribute('data-header-index');
                const bodyIndex = btn.getAttribute('data-body-index');
                
                if (responseIndex !== null) {
                    this.startEditing(endpointIndex, parseInt(responseIndex));
                } else if (headerIndex !== null) {
                    this.startEditingHeader(endpointIndex, parseInt(headerIndex));
                } else if (bodyIndex !== null) {
                    this.startEditingBody(endpointIndex, parseInt(bodyIndex));
                }
            }
        });

        // Save buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.save-btn')) {
                const btn = e.target.closest('.save-btn');
                const endpointIndex = parseInt(btn.getAttribute('data-endpoint-index'));
                const responseIndex = btn.getAttribute('data-response-index');
                const headerIndex = btn.getAttribute('data-header-index');
                const bodyIndex = btn.getAttribute('data-body-index');
                
                if (responseIndex !== null) {
                    this.saveResponse(endpointIndex, parseInt(responseIndex));
                } else if (headerIndex !== null) {
                    this.saveHeader(endpointIndex, parseInt(headerIndex));
                } else if (bodyIndex !== null) {
                    this.saveBody(endpointIndex, parseInt(bodyIndex));
                }
            }
        });

        // Cancel buttons
        document.addEventListener('click', (e) => {
            if (e.target.closest('.cancel-btn')) {
                const btn = e.target.closest('.cancel-btn');
                const endpointIndex = parseInt(btn.getAttribute('data-endpoint-index'));
                const responseIndex = btn.getAttribute('data-response-index');
                const headerIndex = btn.getAttribute('data-header-index');
                const bodyIndex = btn.getAttribute('data-body-index');
                
                if (responseIndex !== null) {
                    this.cancelEditing(endpointIndex, parseInt(responseIndex));
                } else if (headerIndex !== null) {
                    this.cancelEditingHeader(endpointIndex, parseInt(headerIndex));
                } else if (bodyIndex !== null) {
                    this.cancelEditingBody(endpointIndex, parseInt(bodyIndex));
                }
            }
        });

        // Clickable response examples
        document.addEventListener('click', (e) => {
            if (e.target.closest('.clickable-response')) {
                const responseDiv = e.target.closest('.clickable-response');
                const endpointIndex = parseInt(responseDiv.getAttribute('data-endpoint-index'));
                const responseIndex = responseDiv.getAttribute('data-response-index');
                const headerIndex = responseDiv.getAttribute('data-header-index');
                const bodyIndex = responseDiv.getAttribute('data-body-index');
                
                if (responseIndex !== null) {
                    this.startEditing(endpointIndex, parseInt(responseIndex));
                } else if (headerIndex !== null) {
                    this.startEditingHeader(endpointIndex, parseInt(headerIndex));
                } else if (bodyIndex !== null) {
                    this.startEditingBody(endpointIndex, parseInt(bodyIndex));
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // ESC key to cancel editing
            if (e.key === 'Escape') {
                if (this.editingResponse) {
                    const { endpointIndex, responseIndex } = this.editingResponse;
                    this.cancelEditing(endpointIndex, responseIndex);
                } else if (this.editingHeader) {
                    const { endpointIndex, headerIndex } = this.editingHeader;
                    this.cancelEditingHeader(endpointIndex, headerIndex);
                } else if (this.editingBody) {
                    const { endpointIndex, bodyIndex } = this.editingBody;
                    this.cancelEditingBody(endpointIndex, bodyIndex);
                }
            }
            
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault(); // Prevent browser save dialog
                if (this.editingResponse) {
                    const { endpointIndex, responseIndex } = this.editingResponse;
                    this.saveResponse(endpointIndex, responseIndex);
                } else if (this.editingHeader) {
                    const { endpointIndex, headerIndex } = this.editingHeader;
                    this.saveHeader(endpointIndex, headerIndex);
                } else if (this.editingBody) {
                    const { endpointIndex, bodyIndex } = this.editingBody;
                    this.saveBody(endpointIndex, bodyIndex);
                }
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

    // Request Header editing methods
    startEditingHeader(endpointIndex, headerIndex) {
        const display = document.getElementById(`header-${endpointIndex}-${headerIndex}`);
        const editor = document.getElementById(`editor-header-${endpointIndex}-${headerIndex}`);
        
        if (display && editor) {
            display.classList.add('d-none');
            editor.classList.remove('d-none');
            
            // Set editing state
            this.editingHeader = { endpointIndex, headerIndex };
            
            // Focus the textarea
            const textarea = editor.querySelector('.json-editor');
            if (textarea) {
                textarea.focus();
            }
        }
    }

    cancelEditingHeader(endpointIndex, headerIndex) {
        const display = document.getElementById(`header-${endpointIndex}-${headerIndex}`);
        const editor = document.getElementById(`editor-header-${endpointIndex}-${headerIndex}`);
        
        if (display && editor) {
            editor.classList.add('d-none');
            display.classList.remove('d-none');
            
            // Clear editing state
            this.editingHeader = null;
        }
    }

    async saveHeader(endpointIndex, headerIndex) {
        try {
            const editor = document.getElementById(`editor-header-${endpointIndex}-${headerIndex}`);
            const textarea = editor.querySelector('.json-editor');
            const newDescription = textarea.value;

            console.log('Saving header:', { endpointIndex, headerIndex, newDescription });

            // Update the data
            if (this.apiData && this.apiData.endpoints[endpointIndex] && this.apiData.endpoints[endpointIndex].requestHeaders) {
                this.apiData.endpoints[endpointIndex].requestHeaders[headerIndex].description = newDescription;
            }

            // Update the display
            const display = document.getElementById(`header-${endpointIndex}-${headerIndex}`);
            display.textContent = newDescription || 'No description available';
            
            // Hide editor and show display
            this.cancelEditingHeader(endpointIndex, headerIndex);
            
            this.showToast('Header description saved successfully!', 'success');
        } catch (error) {
            console.error('Save header error:', error);
            this.showToast('Failed to save header: ' + error.message, 'error');
        }
    }

    // Request Body editing methods
    startEditingBody(endpointIndex, bodyIndex) {
        const display = document.getElementById(`body-${endpointIndex}-${bodyIndex}`);
        const editor = document.getElementById(`editor-body-${endpointIndex}-${bodyIndex}`);
        
        if (display && editor) {
            display.classList.add('d-none');
            editor.classList.remove('d-none');
            
            // Set editing state
            this.editingBody = { endpointIndex, bodyIndex };
            
            // Focus the textarea
            const textarea = editor.querySelector('.json-editor');
            if (textarea) {
                textarea.focus();
            }
        }
    }

    cancelEditingBody(endpointIndex, bodyIndex) {
        const display = document.getElementById(`body-${endpointIndex}-${bodyIndex}`);
        const editor = document.getElementById(`editor-body-${endpointIndex}-${bodyIndex}`);
        
        if (display && editor) {
            editor.classList.add('d-none');
            display.classList.remove('d-none');
            
            // Clear editing state
            this.editingBody = null;
        }
    }

    async saveBody(endpointIndex, bodyIndex) {
        try {
            const editor = document.getElementById(`editor-body-${endpointIndex}-${bodyIndex}`);
            const textarea = editor.querySelector('.json-editor');
            let newDescription = textarea.value;

            console.log('Saving body:', { endpointIndex, bodyIndex, newDescription });

            // Try to parse as JSON if it looks like JSON
            try {
                if (newDescription.trim().startsWith('{') || newDescription.trim().startsWith('[')) {
                    const parsedJson = JSON.parse(newDescription);
                    newDescription = JSON.stringify(parsedJson, null, 2);
                }
            } catch (e) {
                // Keep as string if not valid JSON
            }

            // Update the data
            if (this.apiData && this.apiData.endpoints[endpointIndex] && this.apiData.endpoints[endpointIndex].requestBody) {
                this.apiData.endpoints[endpointIndex].requestBody.description = newDescription;
            }

            // Update the display
            const display = document.getElementById(`body-${endpointIndex}-${bodyIndex}`);
            display.textContent = newDescription || 'Request body for this endpoint';
            
            // Hide editor and show display
            this.cancelEditingBody(endpointIndex, bodyIndex);
            
            this.showToast('Request body saved successfully!', 'success');
        } catch (error) {
            console.error('Save body error:', error);
            this.showToast('Failed to save request body: ' + error.message, 'error');
        }
    }

    hideLoading() {
        document.getElementById('loading-state').classList.add('d-none');
        document.getElementById('endpoints-container').classList.remove('d-none');
        document.getElementById('stats-container').classList.remove('d-none');
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
    window.editor = new ApiEditor();
});
