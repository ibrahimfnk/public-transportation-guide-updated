document.querySelectorAll('.step').forEach(step => {
    step.addEventListener('click', () => {
        step.classList.toggle('active');
    });
});