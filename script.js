// script.js

// --- DOM Element References ---
const funnelTitle = document.getElementById('funnel-title');
const funnelDescription = document.getElementById('funnel-description');
const funnelInteraction = document.getElementById('funnel-interaction');
const aiResponseArea = document.getElementById('ai-response-area');
// userEmailInput and startFunnelBtn are initially referenced here,
// but will be re-referenced dynamically in resetFunnel if the DOM changes.
let userEmailInput = document.getElementById('user-email');
let startFunnelBtn = document.getElementById('start-funnel-btn');
const loadingIndicator = document.getElementById('loading-indicator');
const messageBox = document.getElementById('message-box');
const messageBoxTitle = document.getElementById('message-box-title');
const messageBoxContent = document.getElementById('message-box-content');
const messageBoxOkBtn = document.getElementById('message-box-ok-btn');

// --- State and Configuration ---
let currentFunnelStep = 0;
let userData = {
    email: '',
    companyName: '',
    userRole: '',
    primaryInterest: '',
    chatHistory: []
};
let requestInFlight = false; // Guard to prevent double submissions

const BACKEND_API_BASE_URL = 'https://advansells.com/api';
const DEBUG = false; // Set to true for verbose console logging

// Whitelist for safe Call-to-Action URLs
const CTA_URLS = {
  'Book a Free Demo': 'https://calendly.com/advansells/30min', // Example real link
  // Add other valid CTAs here, e.g., 'Download Case Study': 'https://example.com/study.pdf'
};


// --- Utility Functions ---

/**
 * Displays a custom message box.
 * @param {string} title - The title of the message box.
 * @param {string} message - The content message.
 * @param {function} [callback] - Optional callback for the OK button.
 */
function showMessageBox(title, message, callback = null) {
    messageBoxTitle.textContent = title;
    messageBoxContent.textContent = message;
    messageBox.classList.remove('hidden');

    messageBoxOkBtn.onclick = null;
    messageBoxOkBtn.onclick = () => {
        messageBox.classList.add('hidden');
        if (callback) {
            callback();
        }
    };
}

/**
 * Toggles the loading indicator.
 * @param {boolean} isLoading - True to show, false to hide.
 */
function showLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
        loadingIndicator.classList.add('flex');
    } else {
        loadingIndicator.classList.add('hidden');
        loadingIndicator.classList.remove('flex');
    }
}

/**
 * Smoothly updates the main content area.
 * @param {string} newTitle - The new title.
 * @param {string} newDescription - The new description.
 * @param {string} newInteractionHtml - HTML for the new interactive elements.
 */
function updateContent(newTitle, newDescription, newInteractionHtml) {
    funnelTitle.classList.add('fade-in-out', 'opacity-0');
    funnelDescription.classList.add('fade-in-out', 'opacity-0');
    funnelInteraction.classList.add('fade-in-out', 'opacity-0');
    aiResponseArea.classList.add('fade-in-out', 'opacity-0');

    setTimeout(() => {
        funnelTitle.textContent = newTitle;
        funnelDescription.textContent = newDescription;
        funnelInteraction.innerHTML = DOMPurify.sanitize(newInteractionHtml);

        if (newInteractionHtml.includes('ai-response-content')) {
            aiResponseArea.classList.remove('hidden');
        } else {
            aiResponseArea.classList.add('hidden');
        }

        funnelTitle.classList.remove('opacity-0');
        funnelDescription.classList.remove('opacity-0');
        funnelInteraction.classList.remove('opacity-0');
        aiResponseArea.classList.remove('opacity-0');

        attachDynamicEventListeners();
    }, 500);
}

/**
 * Attaches event listeners to dynamically created elements.
 * This is now simplified to only handle the initial details form submission,
 * as all other clicks are handled by the main event delegator.
 */
function attachDynamicEventListeners() {
    const submitDetailsBtn = document.getElementById('submit-details-btn');
    if (submitDetailsBtn) {
        submitDetailsBtn.onclick = submitFormDetails;
    }
}

/**
 * Sends data to the backend.
 * @param {object} data - The data payload to send.
 * @returns {Promise<object>} - A promise that resolves with the AI's response.
 */
async function sendToBackend(data) {
    if (requestInFlight) {
        if (DEBUG) console.log("Request blocked: A request is already in flight.");
        return Promise.reject(new Error('Request already in flight'));
    }
    requestInFlight = true;
    showLoading(true);

    if (DEBUG) {
        console.log(`[Frontend] Sending POST to: ${BACKEND_API_BASE_URL}/advansells-funnel`);
        console.log("[Frontend] Payload:", JSON.stringify(data, null, 2));
    }

    try {
        const response = await fetch(`${BACKEND_API_BASE_URL}/advansells-funnel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (DEBUG) console.log("[Frontend] Response status:", response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("[Frontend] Backend Error:", errorData);
            throw new Error(errorData.message || 'Server error');
        }

        const result = await response.json();
        if (DEBUG) console.log("[Frontend] Backend Success:", result);
        return result;

    } catch (error) {
        console.error('[Frontend] Communication error:', error);
        showMessageBox('Error', 'Could not connect to the AI. Please try again later.', resetFunnel);
        throw error;
    } finally {
        showLoading(false);
        requestInFlight = false;
    }
}

/**
 * Handles the initial funnel start.
 */
async function startFunnel() {
    const email = userEmailInput.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessageBox('Invalid Email', 'Please enter a valid email address.');
        return;
    }

    userData.email = email;
    currentFunnelStep = 1;

    updateContent(
        "Tell Us More About Your Needs",
        "A few quick details help us tailor your AI journey.",
        `
            <div class="w-full max-w-md text-left">
                <div class="mb-4">
                    <label for="company-name" class="block text-gray-700 text-sm font-bold mb-2">Company Name (Optional):</label>
                    <input type="text" id="company-name" placeholder="E.g., Beauty Innovations Inc." class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800">
                </div>
                <div class="mb-4">
                    <label for="user-role" class="block text-gray-700 text-sm font-bold mb-2">Your Role:</label>
                    <select id="user-role" class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800" required>
                        <option value="">Select your role</option>
                        <option value="Owner/CEO">Owner/CEO</option>
                        <option value="Marketing Manager">Marketing Manager</option>
                        <option value="Sales Director">Sales Director</option>
                        <option value="Product Development">Product Development</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                <div class="mb-6">
                    <label for="primary-interest" class="block text-gray-700 text-sm font-bold mb-2">Primary Interest:</label>
                    <select id="primary-interest" class="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800" required>
                        <option value="">Select your primary interest</option>
                        <option value="Grow Sales">Grow Sales</option>
                        <option value="Improve Customer Loyalty">Improve Customer Loyalty</option>
                        <option value="Gain Market Insights">Gain Market Insights</option>
                        <option value="Increase Operational Efficiency">Increase Operational Efficiency</option>
                        <option value="Just Exploring AI">Just Exploring AI</option>
                    </select>
                </div>
                <button id="submit-details-btn" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105">
                    Continue to AI Guide
                </button>
            </div>
        `
    );
}

/**
 * Handles the submission of the initial information form.
 */
async function submitFormDetails() {
    const companyName = document.getElementById('company-name').value.trim();
    const userRole = document.getElementById('user-role').value;
    const primaryInterest = document.getElementById('primary-interest').value;

    if (!userRole || !primaryInterest) {
        showMessageBox('Input Required', 'Please select your role and primary interest.');
        return;
    }

    userData.companyName = companyName;
    userData.userRole = userRole;
    userData.primaryInterest = primaryInterest;
    currentFunnelStep = 2;

    const initialPrompt = `User email: ${userData.email}. Company: ${userData.companyName || 'N/A'}. Role: ${userData.userRole}. Primary Interest: ${userData.primaryInterest}. The user has just provided initial details. Initiate a personalized sales funnel for a cosmetics AI agency. Start by acknowledging their interest and asking a concise, engaging question related to their primary interest to dive deeper.`;
    userData.chatHistory.push({ role: "user", parts: [{ text: initialPrompt }] });

    try {
        const aiResponse = await sendToBackend({
            ...userData,
            currentStep: currentFunnelStep,
            action: 'submit_initial_details',
            userResponse: initialPrompt
        });
        processAIResponse(aiResponse);
    } catch (error) {
        if (DEBUG) console.error("Failed to submit form details:", error);
    }
}

/**
 * Processes the AI's response and updates the UI.
 * @param {object} aiResponse - The response object from the backend.
 */
function processAIResponse(aiResponse) {
    if (!aiResponse || !aiResponse.text) {
        showMessageBox('AI Error', 'Received an invalid response from the AI. Please try again.');
        return;
    }

    userData.chatHistory.push({ role: "model", parts: [{ text: aiResponse.text }] });

    let newTitle = "Your AI Journey Continues...";
    let newDescription = '';
    let newInteractionHtml = '';

    if (aiResponse.type === 'question' && aiResponse.options && aiResponse.options.length > 0) {
        newInteractionHtml = `
            <div id="ai-response-content" class="w-full">
                <p class="text-lg text-gray-700 mb-6">${DOMPurify.sanitize(aiResponse.text)}</p>
                <div class="flex flex-col space-y-4">
                    ${aiResponse.options.map(option => `
                        <button class="response-btn w-full bg-purple-100 text-purple-800 font-semibold py-3 px-6 rounded-xl transition duration-300 ease-in-out hover:bg-purple-200" data-response="${DOMPurify.sanitize(option)}">
                            ${DOMPurify.sanitize(option)}
                        </button>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (aiResponse.type === 'input_required') {
        newInteractionHtml = `
            <div id="ai-response-content" class="w-full">
                <p class="text-lg text-gray-700 mb-6">${DOMPurify.sanitize(aiResponse.text)}</p>
                <textarea id="user-free-input" placeholder="Type your response here..." class="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 h-32"></textarea>
                <button id="submit-response-btn" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105">
                    Submit
                </button>
            </div>
        `;
    } else if (aiResponse.type === 'offer' || aiResponse.type === 'closing') {
        newInteractionHtml = `
            <div id="ai-response-content" class="w-full">
                <p class="text-lg text-gray-700 mb-6">${DOMPurify.sanitize(aiResponse.text)}</p>
                <button id="call-to-action-btn" class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105" data-cta-type="${DOMPurify.sanitize(aiResponse.cta)}">
                    ${DOMPurify.sanitize(aiResponse.cta || 'Learn More')}
                </button>
            </div>
        `;
    } else {
        console.error("AI returned an unexpected response type:", aiResponse.type);
        showMessageBox('AI Response Error', 'The AI returned an unexpected response. Resetting the funnel.', resetFunnel);
        return;
    }

    updateContent(newTitle, newDescription, newInteractionHtml);
}

/**
 * Handles a user's response to an AI multiple-choice question.
 * @param {string} responseText - The text of the user's chosen response.
 */
async function handleUserResponse(responseText) {
    currentFunnelStep++;
    userData.chatHistory.push({ role: "user", parts: [{ text: responseText }] });

    try {
        const aiResponse = await sendToBackend({
            ...userData,
            currentStep: currentFunnelStep,
            action: 'user_response',
            userResponse: responseText
        });
        processAIResponse(aiResponse);
    } catch (error) {
        if (DEBUG) console.error("Failed to send user response:", error);
    }
}

/**
 * Handles the submission of free-form text input.
 */
async function handleSubmitFreeInput() {
    const freeInput = document.getElementById('user-free-input').value.trim();
    if (!freeInput) {
        showMessageBox('Input Required', 'Please type your response before submitting.');
        return;
    }

    currentFunnelStep++;
    userData.chatHistory.push({ role: "user", parts: [{ text: freeInput }] });

    try {
        const aiResponse = await sendToBackend({
            ...userData,
            currentStep: currentFunnelStep,
            action: 'user_free_input',
            userResponse: freeInput
        });
        processAIResponse(aiResponse);
    } catch (error) {
        if (DEBUG) console.error("Failed to submit free input:", error);
    }
}

/**
 * Handles the main Call to Action button click.
 * @param {string} ctaType - The call to action type from the AI response.
 */
function handleCallToAction(ctaType) {
    if (DEBUG) console.log("CTA clicked:", ctaType);

    const redirectUrl = CTA_URLS[ctaType];

    if (!redirectUrl) {
      // If the CTA is not in our allowed list, show a polite message and reset.
      showMessageBox('Thanks!', 'We’ll follow up by email with the next step.');
      resetFunnel();
      return;
    }

    // If the CTA is valid, show a confirmation and then open the link.
    showMessageBox('Action Taken', 'Opening your next step…', () => {
      window.open(redirectUrl, '_blank');
      resetFunnel();
    });
}

/**
 * Resets the funnel to its initial state.
 */
function resetFunnel() {
    currentFunnelStep = 0;
    userData = { email: '', companyName: '', userRole: '', primaryInterest: '', chatHistory: [] };
    updateContent(
        "Discover Your Sales Potential",
        "Ready to transform your cosmetics business? Our AI will guide you to unprecedented growth.",
        `
            <input type="email" id="user-email" placeholder="Enter your email to begin" class="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800" required>
            <button id="start-funnel-btn" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105">
                Start Your AI Journey
            </button>
        `
    );
    // Re-get references to the newly created elements
    userEmailInput = document.getElementById('user-email');
    startFunnelBtn = document.getElementById('start-funnel-btn');

    if (userEmailInput) userEmailInput.value = '';
    if (startFunnelBtn) startFunnelBtn.onclick = startFunnel;
}


// --- Event Listeners Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial listener for the start button
    if (startFunnelBtn) {
        startFunnelBtn.onclick = startFunnel;
    }

    // Main event delegator for dynamically created buttons
    document.body.addEventListener('click', (event) => {
        const target = event.target.closest('button'); // Find the closest button element
        if (!target) return; // Exit if the click was not on a button

        if (target.id === 'submit-response-btn') {
            handleSubmitFreeInput();
        } else if (target.id === 'call-to-action-btn') {
            handleCallToAction(target.dataset.ctaType);
        } else if (target.classList.contains('response-btn')) {
            handleUserResponse(target.dataset.response);
        }
    });
});
