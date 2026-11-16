// Shared JavaScript functionality for SmartSDLC frontend pages

// Utility to send POST request and return JSON
async function postData(url = '', data = {}) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    return await response.json();
  } catch (error) {
    return { error: 'Failed to connect to backend: ' + error.message };
  }
}

// Utility to populate result box
function displayResult(id, data) {
  document.getElementById(id).textContent = data.output || data.response || data.error || 'No output';
}

// SmartSDLC Frontend JavaScript with Storage Support
// Use relative API paths for deployment compatibility
const API_BASE = window.location.origin + '/api';

// Global state
let currentSession = null;
let uploadedFiles = [];
let generationHistory = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 SmartSDLC Frontend Initialized');
    initializeEventListeners();
    checkBackendStatus();
});

function initializeEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('href').substring(1);
            showSection(target);
        });
    });

    // File upload
    const fileInput = document.getElementById('requirementFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    // Form submissions
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUploadSubmit);
    }

    const codegenForm = document.getElementById('codegenForm');
    if (codegenForm) {
        codegenForm.addEventListener('submit', handleCodeGeneration);
    }

    const bugfixForm = document.getElementById('bugfixForm');
    if (bugfixForm) {
        bugfixForm.addEventListener('submit', handleBugFix);
    }

    const testgenForm = document.getElementById('testgenForm');
    if (testgenForm) {
        testgenForm.addEventListener('submit', handleTestGeneration);
    }

    const summarizerForm = document.getElementById('summarizerForm');
    if (summarizerForm) {
        summarizerForm.addEventListener('submit', handleCodeSummarization);
    }

    // Load history
    loadUploadedFiles();
    loadGenerationHistory();
}

async function checkBackendStatus() {
    try {
        const response = await fetch('/health');
        const data = await response.json();
        
        if (data.status === 'healthy') {
            console.log('✅ Backend is healthy');
            showNotification('Backend connected successfully', 'success');
        } else {
            throw new Error('Backend not healthy');
        }
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        showNotification('Backend connection failed. Please start the server.', 'error');
    }
}

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.style.display = 'none';
    });

    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[href="#${sectionId}"]`).classList.add('active');
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showNotification('Please select a PDF file', 'error');
        return;
    }

    // Show file info
    const fileInfo = document.getElementById('fileInfo');
    if (fileInfo) {
        fileInfo.innerHTML = `
            <div class="file-info">
                <strong>Selected File:</strong> ${file.name}<br>
                <strong>Size:</strong> ${(file.size / 1024).toFixed(2)} KB<br>
                <strong>Type:</strong> ${file.type}
            </div>
        `;
    }
}

async function handleUploadSubmit(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('requirementFile');
    const file = fileInput.files[0];
    
    if (!file) {
        showNotification('Please select a file to upload', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
        showNotification('Uploading and classifying file...', 'info');
        
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        showNotification('File uploaded and classified successfully!', 'success');
        
        // Display classification results
        displayClassificationResults(result);
        
        // Refresh file list
        loadUploadedFiles();
        
    } catch (error) {
        console.error('Upload error:', error);
        showNotification('Upload failed: ' + error.message, 'error');
    }
}

function displayClassificationResults(result) {
    const resultsDiv = document.getElementById('classificationResults');
    if (!resultsDiv) return;

    const classification = result.classification;
    if (!classification) return;

    resultsDiv.innerHTML = `
        <div class="classification-results">
            <h3>📋 Classification Results</h3>
            <div class="result-grid">
                <div class="result-item">
                    <strong>Requirement Type:</strong> ${classification.requirement_type}
                </div>
                <div class="result-item">
                    <strong>Priority:</strong> <span class="priority-${classification.priority.toLowerCase()}">${classification.priority}</span>
                </div>
                <div class="result-item">
                    <strong>Complexity:</strong> ${classification.complexity}
                </div>
                <div class="result-item">
                    <strong>Estimated Effort:</strong> ${classification.estimated_effort}
                </div>
            </div>
            
            <div class="result-section">
                <h4>Description:</h4>
                <p>${classification.description}</p>
            </div>
            
            <div class="result-section">
                <h4>Acceptance Criteria:</h4>
                <ul>
                    ${classification.acceptance_criteria.map(criteria => `<li>${criteria}</li>`).join('')}
                </ul>
            </div>
            
            <div class="result-section">
                <h4>Dependencies:</h4>
                <ul>
                    ${classification.dependencies.map(dep => `<li>${dep}</li>`).join('')}
                </ul>
            </div>
            
            <div class="result-section">
                <h4>Risks:</h4>
                <ul>
                    ${classification.risks.map(risk => `<li>${risk}</li>`).join('')}
                </ul>
            </div>
        </div>
    `;
}

async function loadUploadedFiles() {
    try {
        const response = await fetch(`${API_BASE}/files`);
        if (!response.ok) throw new Error('Failed to load files');
        
        const files = await response.json();
        uploadedFiles = files;
        
        const filesList = document.getElementById('uploadedFilesList');
        if (filesList) {
            filesList.innerHTML = files.map(file => `
                <div class="file-item">
                    <div class="file-info">
                        <strong>${file.filename}</strong><br>
                        <small>Uploaded: ${new Date(file.uploaded_at).toLocaleString()}</small>
                    </div>
                    <div class="file-status">
                        ${file.processed ? '✅ Processed' : '⏳ Processing'}
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

async function handleCodeGeneration(event) {
    event.preventDefault();
    
    const prompt = document.getElementById('codePrompt').value;
    const language = document.getElementById('codeLanguage').value;
    const framework = document.getElementById('codeFramework').value;
    
    if (!prompt.trim()) {
        showNotification('Please enter a prompt', 'error');
        return;
    }

    try {
        showNotification('Generating code...', 'info');
        
        const response = await fetch(`${API_BASE}/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                language: language,
                framework: framework || null
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Display generated code
        const codeOutput = document.getElementById('codeOutput');
        if (codeOutput) {
            codeOutput.innerHTML = `
                <div class="code-result">
                    <h3>Generated Code</h3>
                    <div class="code-explanation">
                        <strong>Explanation:</strong> ${result.explanation}
                    </div>
                    <div class="code-container">
                        <pre><code class="language-${language}">${escapeHtml(result.generated_code)}</code></pre>
                    </div>
                    ${result.file_path ? `<div class="file-info">📁 Saved to: ${result.file_path}</div>` : ''}
                </div>
            `;
        }
        
        showNotification('Code generated successfully!', 'success');
        
        // Refresh history
        loadGenerationHistory();
        
    } catch (error) {
        console.error('Code generation error:', error);
        showNotification('Code generation failed: ' + error.message, 'error');
    }
}

async function loadGenerationHistory() {
    try {
        const response = await fetch(`${API_BASE}/history`);
        if (!response.ok) throw new Error('Failed to load history');
        
        const history = await response.json();
        generationHistory = history;
        
        const historyList = document.getElementById('generationHistory');
        if (historyList) {
            historyList.innerHTML = history.map(item => `
                <div class="history-item">
                    <div class="history-info">
                        <strong>${item.prompt.substring(0, 50)}...</strong><br>
                        <small>${item.language}${item.framework ? ` + ${item.framework}` : ''}</small><br>
                        <small>${new Date(item.created_at).toLocaleString()}</small>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

async function handleBugFix(event) {
    event.preventDefault();
    
    const code = document.getElementById('bugCode').value;
    const language = document.getElementById('bugLanguage').value;
    
    if (!code.trim()) {
        showNotification('Please enter code to analyze', 'error');
        return;
    }

    try {
        showNotification('Analyzing code for bugs...', 'info');
        
        const response = await fetch(`${API_BASE}/fix-bugs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: code,
                language: language
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Display bug fix results
        const bugOutput = document.getElementById('bugOutput');
        if (bugOutput) {
            bugOutput.innerHTML = `
                <div class="bug-result">
                    <h3>Bug Analysis & Fixes</h3>
                    <div class="bugs-found">
                        <h4>Bugs Found:</h4>
                        <ul>
                            ${result.bugs_found.map(bug => `<li>${bug}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="fixed-code">
                        <h4>Fixed Code:</h4>
                        <pre><code class="language-${language}">${escapeHtml(result.fixed_code)}</code></pre>
                    </div>
                    <div class="explanation">
                        <h4>Explanation:</h4>
                        <p>${result.explanation}</p>
                    </div>
                </div>
            `;
        }
        
        showNotification('Bug analysis completed!', 'success');
        
    } catch (error) {
        console.error('Bug fix error:', error);
        showNotification('Bug analysis failed: ' + error.message, 'error');
    }
}

async function handleTestGeneration(event) {
    event.preventDefault();
    
    const code = document.getElementById('testCode').value;
    const language = document.getElementById('testLanguage').value;
    const framework = document.getElementById('testFramework').value;
    const testType = document.getElementById('testType').value;
    
    if (!code.trim()) {
        showNotification('Please enter code to generate tests for', 'error');
        return;
    }

    try {
        showNotification('Generating tests...', 'info');
        
        const response = await fetch(`${API_BASE}/generate-tests`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: code,
                language: language,
                framework: framework,
                test_type: testType
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Display test results
        const testOutput = document.getElementById('testOutput');
        if (testOutput) {
            testOutput.innerHTML = `
                <div class="test-result">
                    <h3>Generated Tests</h3>
                    <div class="test-info">
                        <strong>Type:</strong> ${testType} tests<br>
                        <strong>Framework:</strong> ${framework}<br>
                        <strong>Coverage:</strong> ${result.coverage_analysis}
                    </div>
                    <div class="test-code">
                        <pre><code class="language-${language}">${escapeHtml(result.test_code)}</code></pre>
                    </div>
                </div>
            `;
        }
        
        showNotification('Tests generated successfully!', 'success');
        
    } catch (error) {
        console.error('Test generation error:', error);
        showNotification('Test generation failed: ' + error.message, 'error');
    }
}

async function handleCodeSummarization(event) {
    event.preventDefault();
    
    const code = document.getElementById('summaryCode').value;
    const language = document.getElementById('summaryLanguage').value;
    const summaryType = document.getElementById('summaryType').value;
    
    if (!code.trim()) {
        showNotification('Please enter code to summarize', 'error');
        return;
    }

    try {
        showNotification('Generating code summary...', 'info');
        
        const response = await fetch(`${API_BASE}/summarize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                code: code,
                language: language,
                summary_type: summaryType
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Display summary results
        const summaryOutput = document.getElementById('summaryOutput');
        if (summaryOutput) {
            summaryOutput.innerHTML = `
                <div class="summary-result">
                    <h3>Code Summary</h3>
                    <div class="summary-content">
                        <h4>Summary:</h4>
                        <p>${result.summary}</p>
                    </div>
                    <div class="complexity-analysis">
                        <h4>Complexity Analysis:</h4>
                        <p>${result.complexity_analysis}</p>
                    </div>
                    <div class="documentation">
                        <h4>Documentation:</h4>
                        <pre><code>${escapeHtml(result.documentation)}</code></pre>
                    </div>
                </div>
            `;
        }
        
        showNotification('Code summary generated!', 'success');
        
    } catch (error) {
        console.error('Summarization error:', error);
        showNotification('Summarization failed: ' + error.message, 'error');
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}
