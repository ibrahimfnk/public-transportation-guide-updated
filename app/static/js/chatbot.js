// JavaScript to show the chat when the button is clicked
const showChatBtn = document.getElementById('showChatBtn');
const chatContainer = document.getElementById('chatContainer');
const messages = document.getElementById('messages');
const queryInput = document.getElementById('queryInput');
const sendBtn = document.getElementById('sendBtn');
const closeChatBtn = document.getElementById('closeChatBtn');
const clearMessagesBtn = document.getElementById('clearMessagesBtn');

// Show or hide the chat when the button is clicked
showChatBtn.addEventListener('click', function() {
    chatContainer.style.display = chatContainer.style.display === 'none' || chatContainer.style.display === '' ? 'block' : 'none';
});

// Handle message sending
sendBtn.addEventListener('click', function() {
    const query = queryInput.value;
    if (query) {
        // Display user message
        const userMessage = document.createElement('div');
        userMessage.className = 'message user-message';
        userMessage.innerHTML = `<p>${query}</p>`;
        messages.appendChild(userMessage);
        messages.scrollTop = messages.scrollHeight; // Scroll to the bottom

        // Send message to server
        fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `query=${encodeURIComponent(query)}` // Send the query
        })
        .then(response => response.json()) // Expecting JSON response
        .then(data => {
            // Display bot response
            const botMessage = document.createElement('div');
            botMessage.className = 'message bot-message';
            botMessage.innerHTML = `<p>${data.response}</p>`;
            messages.appendChild(botMessage);
            messages.scrollTop = messages.scrollHeight; // Scroll to the bottom
            queryInput.value = ''; // Clear input field
        })
        .catch(error => console.error('Error:', error));
    }
});

// Close the chat container
closeChatBtn.addEventListener('click', function() {
    chatContainer.style.display = 'none';
});

// Clear the conversation messages
clearMessagesBtn.addEventListener('click', function() {
    messages.innerHTML = ''; // Clear all messages
});