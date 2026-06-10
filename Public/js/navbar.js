document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.unibite-nav .container');
    if (!nav) return;

    // Βρίσκει με class — δουλεύει σε όλες τις σελίδες
    const navActions = nav.querySelector('.nav-actions');
    if (!navActions) return;

    // Φτιάχνει το hamburger button
    const btn = document.createElement('button');
    btn.className = 'hamburger-btn';
    btn.setAttribute('aria-label', 'Άνοιγμα μενού');
    btn.innerHTML = '<span></span><span></span><span></span>';
    nav.insertBefore(btn, navActions);

    // Toggle
    btn.addEventListener('click', () => {
        navActions.classList.toggle('open');
        btn.classList.toggle('open');
    });
});