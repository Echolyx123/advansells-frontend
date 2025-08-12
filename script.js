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

// --- Funnel State Variables ---
let currentFunnelStep = 0; // 0: Email, 1: Initial Form, 2+: AI Interaction
let userData = {
    email: '',
    companyName: '',
    userRole: '',
    primaryInterest: '',
    chatHistory: [] // To store conversation for AI context
};

// --- Configuration ---
// IMPORTANT: This URL is for local development when running Flask on port 5000.
// When deploying, you will replace this with your deployed backend API URL.
const BACKEND_API_BASE_URL = 'https://advansells.com/api';


// --- Utility Functions ---

/**
 * Displays a custom message box instead of native alert/confirm.
 * @param {string} title - The title of the message box.
 * @param {string} message - The content message.
 * @param {function} [callback] - Optional callback function to execute when OK is clicked.
 */
function showMessageBox(title, message, callback = null) {
    messageBoxTitle.textContent = title;
    messageBoxContent.textContent = message;
    messageBox.classList.remove('hidden'); // Show the message box

    // Remove previous event listener to prevent multiple calls
    messageBoxOkBtn.onclick = null;
    messageBoxOkBtn.onclick = () => {
        messageBox.classList.add('hidden'); // Hide the message box
        if (callback) {
            callback();
        }
    };
}

/**
 * Toggles the visibility of the loading indicator.
 * @param {boolean} isLoading - True to show, false to hide.
 */
function showLoading(isLoading) {
    if (isLoading) {
        loadingIndicator.classList.remove('hidden');
        loadingIndicator.classList.add('flex'); // Ensure flex display for centering
    } else {
        loadingIndicator.classList.add('hidden');
        loadingIndicator.classList.remove('flex');
    }
}

/**
 * Smoothly updates the main content area with new title, description, and interaction HTML.
 * Uses CSS transitions for a smooth fade effect.
 * @param {string} newTitle - The new title for the funnel.
 * @param {string} newDescription - The new description.
 * @param {string} newInteractionHtml - HTML string for the new interactive elements.
 */
function updateContent(newTitle, newDescription, newInteractionHtml) {
    // Apply fade-out effect
    funnelTitle.classList.add('fade-in-out', 'opacity-0');
    funnelDescription.classList.add('fade-in-out', 'opacity-0');
    funnelInteraction.classList.add('fade-in-out', 'opacity-0');
    aiResponseArea.classList.add('fade-in-out', 'opacity-0');

    // Wait for fade-out to complete before changing content
    setTimeout(() => {
        funnelTitle.textContent = newTitle;
        funnelDescription.textContent = newDescription;
        // IMPORTANT: Sanitize newInteractionHtml to prevent XSS attacks
        // Ensure DOMPurify library is loaded in your HTML (e.g., via CDN:
        // <script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/2.3.6/purify.min.js"></script>)
        funnelInteraction.innerHTML = DOMPurify.sanitize(newInteractionHtml);

        // If aiResponseArea is being used, ensure it's visible and content is set
        if (newInteractionHtml.includes('ai-response-content')) { // Simple check if AI content is expected
            aiResponseArea.classList.remove('hidden');
        } else {
            aiResponseArea.classList.add('hidden');
        }

        // Apply fade-in effect
        funnelTitle.classList.remove('opacity-0');
        funnelDescription.classList.remove('opacity-0');
        funnelInteraction.classList.remove('opacity-0');
        aiResponseArea.classList.remove('opacity-0'); // Fade in AI area if it's now visible

        // Re-attach event listeners for newly created elements if any
        attachDynamicEventListeners();

    }, 500); // Matches the CSS transition duration
}

/**
 * Attaches event listeners to dynamically created elements.
 * This needs to be called after updating innerHTML.
 */
function attachDynamicEventListeners() {
    // Event listener for the new form submission button
    const submitDetailsBtn = document.getElementById('submit-details-btn');
    if (submitDetailsBtn) {
        submitDetailsBtn.onclick = submitFormDetails;
    }

    // Existing event listeners (next-step-btn is now removed from default AI responses)
    // const nextStepBtn = document.getElementById('next-step-btn');
    // if (nextStepBtn) {
    //     nextStepBtn.onclick = handleNextStep;
    // }
    const responseButtons = document.querySelectorAll('.response-btn');
    responseButtons.forEach(button => {
        button.onclick = (event) => handleUserResponse(event.target.dataset.response);
    });

    // Attach listener for the new reset session button
    const resetSessionBtn = document.getElementById('reset-session-btn');
    if (resetSessionBtn) {
        resetSessionBtn.onclick = resetUserSession;
    }

    // Attach listener for submit-response-btn (for input_required type)
    const submitResponseBtn = document.getElementById('submit-response-btn');
    if (submitResponseBtn) {
        submitResponseBtn.onclick = handleSubmitFreeInput;
    }
}

/**
 * Sends data to the backend for AI processing.
 * @param {object} data - The data to send (e.g., email, user responses, chat history).
 * @returns {Promise<object>} - A promise that resolves with the AI's response.
 */
async function sendToBackend(data) {
    showLoading(true); // Show loading indicator

    // --- Logging added for debugging ---
    console.log(`[Frontend] Sending POST request to: ${BACKEND_API_BASE_URL}/advansells-funnel`);
    console.log("[Frontend] Request Payload:", JSON.stringify(data, null, 2));
    // --- End Logging ---

    try {
        // Use the configurable BACKEND_API_BASE_URL
        const response = await fetch(`${BACKEND_API_BASE_URL}/advansells-funnel`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });

        // --- Logging added for debugging ---
        console.log("[Frontend] Received response status:", response.status);
        console.log("[Frontend] Received response headers:", response.headers);
        // --- End Logging ---

        if (!response.ok) {
            const errorData = await response.json();
            console.error("[Frontend] Backend Error Response:", errorData); // Log the full error response
            // TODO: Enhance error handling: If backend provides specific error codes/messages,
            // display them more clearly to the user instead of a generic message.
            throw new Error(errorData.message || 'Something went wrong on the server.');
        }

        const result = await response.json();
        console.log("[Frontend] Backend Success Response:", result); // Log the full success response
        return result;

    } catch (error) {
        console.error('[Frontend] Error communicating with backend:', error); // Log the full error object
        showMessageBox('Error', 'Could not connect to the AI. Please ensure the backend server is running and accessible.', () => {
            showLoading(false);
            resetFunnel();
        });
        throw error;
    } finally {
        showLoading(false); // Hide loading indicator regardless of success or failure
    }
}

/**
 * Handles the initial funnel start, validates email, and transitions to the info form.
 */
async function startFunnel() {
    const email = userEmailInput.value.trim();
    if (!email) {
        showMessageBox('Input Required', 'Please enter your email address to begin.');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showMessageBox('Invalid Email', 'Please enter a valid email address.');
        return;
    }

    userData.email = email;
    currentFunnelStep = 1; // Move to the initial info form step

    // Transition to the new form
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
    currentFunnelStep = 2; // Move to the first AI interaction step

    // Initial prompt for the AI, now with more context
    const initialPrompt = `User email: ${userData.email}. Company: ${userData.companyName || 'N/A'}. Role: ${userData.userRole}. Primary Interest: ${userData.primaryInterest}. The user has just provided initial details. Initiate a personalized sales funnel for a cosmetics AI agency. Start by acknowledging their interest and asking a concise, engaging question related to their primary interest to dive deeper.`;
    userData.chatHistory.push({ role: "user", parts: [{ text: initialPrompt }] });

    try {
        const aiResponse = await sendToBackend({
            email: userData.email,
            companyName: userData.companyName,
            userRole: userData.userRole,
            primaryInterest: userData.primaryInterest,
            chatHistory: userData.chatHistory,
            currentStep: currentFunnelStep,
            action: 'submit_initial_details',
            userResponse: initialPrompt // Sending the initial prompt as userResponse for the first AI turn
        });

        processAIResponse(aiResponse);

    } catch (error) {
        console.error("Failed to submit form details:", error);
    }
}

/**
 * Processes the AI's response and updates the UI accordingly.
 * This function will be the core of the dynamic funnel.
 * @param {object} aiResponse - The response object from the backend/AI.
 */
function processAIResponse(aiResponse) {
    if (!aiResponse || !aiResponse.text) {
        showMessageBox('AI Error', 'Received an empty or invalid response from the AI. Please try again.');
        return;
    }

    // Add AI's response to chat history
    userData.chatHistory.push({ role: "model", parts: [{ text: aiResponse.text }] });

    let newTitle = "Your AI Journey Continues...";
    let newDescription = ''; // Set description to empty if AI response content is being shown in ai-response-area
    let newInteractionHtml = '';

    if (aiResponse.type === 'question' && aiResponse.options && aiResponse.options.length > 0) {
        // If AI asks a multiple-choice question
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
        // If AI requires free-form text input for specific, complex details
        newInteractionHtml = `
            <div id="ai-response-content" class="w-full">
                <p class="text-lg text-gray-700 mb-6">${DOMPurify.sanitize(aiResponse.text)}</p>
                <textarea id="user-free-input" placeholder="Type your specific details here (e.g., 'Our main challenge is integrating old CRM data')." class="w-full p-4 mb-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 h-32"></textarea>
                <button id="submit-response-btn" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105">
                    Submit Details
                </button>
            </div>
        `;
    } else if (aiResponse.type === 'offer' || aiResponse.type === 'closing') {
        // If AI is making an offer or closing the sale
        newInteractionHtml = `
            <div id="ai-response-content" class="w-full">
                <p class="text-lg text-gray-700 mb-6">${DOMPurify.sanitize(aiResponse.text)}</p>
                <button id="call-to-action-btn" class="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition duration-300 ease-in-out transform hover:scale-105" data-cta-type="${DOMPurify.sanitize(aiResponse.cta)}">
                    ${DOMPurify.sanitize(aiResponse.cta || 'Learn More')}
                </button>
            </div>
        `;
    } else {
        // Fallback for unexpected AI response types: Display an error and reset
        console.error("AI returned an unexpected response type:", aiResponse.type, aiResponse.text);
        showMessageBox('AI Response Error', 'The AI returned an unexpected response. Please try resetting the funnel.', () => {
            resetFunnel();
        });
        return; // Stop further processing
    }

    updateContent(newTitle, newDescription, newInteractionHtml);
}

/**
 * Handles a user's response to an AI question (e.g., clicking an option).
 * @param {string} responseText - The text of the user's chosen response.
 */
async function handleUserResponse(responseText) {
    currentFunnelStep++;
    userData.chatHistory.push({ role: "user", parts: [{ text: responseText }] });

    try {
        const aiResponse = await sendToBackend({
            email: userData.email,
            companyName: userData.companyName,
            userRole: userData.userRole,
            primaryInterest: userData.primaryInterest,
            chatHistory: userData.chatHistory,
            currentStep: currentFunnelStep,
            action: 'user_response',
            userResponse: responseText
        });
        processAIResponse(aiResponse);
    } catch (error) {
        console.error("Failed to send user response:", error);
    }
}

/**
 * Handles the "Submit Response" button for free-form input.
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
            email: userData.email,
            companyName: userData.companyName,
            userRole: userData.userRole,
            primaryInterest: userData.primaryInterest,
            chatHistory: userData.chatHistory,
            currentStep: currentFunnelStep,
            action: 'user_free_input',
            userResponse: freeInput
        });
        processAIResponse(aiResponse);
    } catch (error) {
        console.error("Failed to submit free input:", error);
    }
}

/**
 * Handles a generic "Continue" or "Next Step" button click.
 * This function is now deprecated as generic "Continue" buttons are removed.
 * It remains here for completeness but should ideally not be triggered.
 */
async function handleNextStep() {
    // This function should ideally not be called anymore if AI always returns specific types.
    console.warn("handleNextStep called. AI should be returning specific interaction types.");
    currentFunnelStep++;
    userData.chatHistory.push({ role: "user", parts: [{ text: "Proceed to the next step." }] }); // Generic message for AI context

    try {
        const aiResponse = await sendToBackend({
            email: userData.email,
            companyName: userData.companyName,
            userRole: userData.userRole,
            primaryInterest: userData.primaryInterest,
            chatHistory: userData.chatHistory,
            currentStep: currentFunnelStep,
            action: 'continue_funnel'
        });
        processAIResponse(aiResponse);
    } catch (error) {
        console.error("Failed to continue funnel:", error);
    }
}

/**
 * Handles the main Call to Action button (e.g., "Learn More", "Schedule a Demo").
 * Now handles different CTA types based on aiResponse.cta.
 * @param {string} ctaType - The specific call to action type from the AI response.
 */
function handleCallToAction(ctaType) {
    console.log("User clicked Call to Action button for email:", userData.email, "CTA Type:", ctaType);

    let message = '';
    let redirectUrl = '';

    // TODO: For production, these URLs should ideally be fetched from the backend
    // or a centralized configuration, rather than hardcoded here.
    switch (ctaType) {
        case 'Book a Free Demo':
            message = 'Great! We will now direct you to our demo booking page.';
            redirectUrl = 'https://example.com/book-demo'; // Replace with your actual demo booking URL
            break;
        case 'Get ROI Estimate':
            message = 'Excellent! We will now guide you to a form to get your custom ROI estimate.';
            redirectUrl = 'https://example.com/roi-estimate-form'; // Replace with your actual ROI estimate form URL
            // In a real app, you might show an inline form here instead of redirecting
            break;
        case 'Download Case Study':
            message = 'Fantastic! Your case study download will begin shortly.';
            redirectUrl = 'https://example.com/cosmetics-case-study.pdf'; // Replace with your actual case study PDF URL
            break;
        case 'Get Sample Report':
            message = 'Perfect! Your sample market trend report will be sent to your email shortly.';
            // In a real app, you might trigger an email send from backend or confirm email here
            break;
        case 'Talk to Specialist':
            message = 'Connecting you with a specialist! We will now direct you to a contact form or scheduling link.';
            redirectUrl = 'https://example.com/contact-specialist'; // Replace with your actual contact specialist URL
            break;
        case 'Send Info':
            message = 'Information will be sent to your email. Check your inbox soon!';
            // In a real app, you might trigger an email send from backend
            break;
        case 'Get Retention Info':
            message = 'Accessing client retention strategies. We will now direct you to relevant resources.';
            redirectUrl = 'https://example.com/retention-info'; // Placeholder URL
            break;
        case 'Learn Patient Experience':
            message = 'Learning how AI enhances patient experience. Redirecting to our insights page.';
            redirectUrl = 'https://example.com/patient-experience'; // Placeholder URL
            break;
        case 'Calculate Time Savings':
            message = 'Calculating potential time savings. We will now direct you to our efficiency calculator.';
            redirectUrl = 'https://example.com/time-savings-calculator'; // Placeholder URL
            break;
        case 'Learn Integration':
            message = 'Learning about seamless integration. Redirecting to our integration details.';
            redirectUrl = 'https://example.com/integration-info'; // Placeholder URL
            break;
        case 'Download Whitepaper':
            message = 'Downloading AI for Cosmetics whitepaper. Your download will start soon.';
            redirectUrl = 'https://example.com/ai-whitepaper.pdf'; // Placeholder URL
            break;
        case 'Explore Use Cases':
            message = 'Exploring common AI use cases. Redirecting to our use cases page.';
            redirectUrl = 'https://example.com/use-cases'; // Placeholder URL
            break;
        default:
            message = 'Great! We will now direct you to the next step.';
            redirectUrl = 'https://example.com/default-next-step'; // Default fallback URL
            break;
    }

    showMessageBox('Action Taken', message, () => {
        if (redirectUrl) {
            window.open(redirectUrl, '_blank'); // Open in new tab
        }
        resetFunnel(); // For demonstration, reset the funnel after action
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
            <button id="reset-session-btn" class="w-full mt-4 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 px-6 rounded-xl shadow-md transition duration-300 ease-in-out">
                Reset Session (for testing)
            </button>
        `
    );
    // Re-get the references to the newly created elements after updateContent
    userEmailInput = document.getElementById('user-email');
    startFunnelBtn = document.getElementById('start-funnel-btn');

    if (userEmailInput) {
        userEmailInput.value = ''; // Ensure the email input is cleared
    }
    if (startFunnelBtn) {
        startFunnelBtn.onclick = startFunnel; // Re-attach the event listener for the start button
    }
}

/**
 * Resets the user's session data on the backend.
 */
async function resetUserSession() {
    const emailToReset = userEmailInput.value.trim();
    if (!emailToReset) {
        showMessageBox('Input Required', 'Please enter the email address you wish to reset.');
        return;
    }

    showMessageBox('Confirm Reset', `Are you sure you want to reset the session for ${emailToReset}? This will delete all chat history for this email.`, async () => {
        showLoading(true);
        // --- Logging added for debugging ---
        console.log(`[Frontend] Sending POST request to: ${BACKEND_API_BASE_URL}/reset-session`);
        console.log("[Frontend] Reset Session Payload:", JSON.stringify({ email: emailToReset }, null, 2));
        // --- End Logging ---
        try {
            // Use the configurable BACKEND_API_BASE_URL for reset endpoint as well
            const response = await fetch(`${BACKEND_API_BASE_URL}/reset-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: emailToReset }),
            });

            // --- Logging added for debugging ---
            console.log("[Frontend] Received reset session response status:", response.status);
            console.log("[Frontend] Received reset session response headers:", response.headers);
            // --- End Logging ---

            if (!response.ok) {
                const errorData = await response.json();
                console.error("[Frontend] Backend Reset Error Response:", errorData); // Log the full error response
                throw new Error(errorData.message || 'Failed to reset session.');
            }

            const result = await response.json();
            console.log("[Frontend] Backend Reset Success Response:", result); // Log the full success response
            showMessageBox('Session Reset', result.message, () => {
                showLoading(false);
                resetFunnel(); // Fully reset frontend state after backend reset
            });
        } catch (error) {
            console.error('[Frontend] Error resetting session:', error); // Log the full error object
            showMessageBox('Error', `Failed to reset session: ${error.message}`, () => {
                showLoading(false);
            });
        }
    });
}


// --- Event Listeners Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial event listener for the start button
    if (startFunnelBtn) {
        startFunnelBtn.onclick = startFunnel;
    }

    // Attach event listeners for dynamically created elements (will be re-attached by updateContent)
    // This is important for buttons that appear after the initial load.
    document.body.addEventListener('click', (event) => {
        if (event.target.id === 'submit-response-btn') {
            handleSubmitFreeInput();
        } else if (event.target.id === 'next-step-btn') { // This branch is now effectively unused
            handleNextStep();
        } else if (event.target.id === 'call-to-action-btn') {
            // Pass the data-cta-type attribute to handleCallToAction
            handleCallToAction(event.target.dataset.ctaType);
        } else if (event.target.classList.contains('response-btn')) {
            handleUserResponse(event.target.dataset.response);
        } else if (event.target.id === 'reset-session-btn') { // New listener for reset button
            resetUserSession();
        }
    });
});

