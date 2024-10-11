// Get the current URL path
const currentPath = window.location.pathname;

// Loop through the nav links and add the 'active' class to the matching link
document.querySelectorAll('nav ul li a').forEach(link => {
  if (link.getAttribute('href') === currentPath) {
    link.classList.add('active');
  }
});